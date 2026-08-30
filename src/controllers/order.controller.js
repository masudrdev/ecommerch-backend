import prisma from "../lib/prisma.js";
import createActivityLog from "../utils/createActivityLog.js";
import createNotification from "../utils/createNotification.js";
import { calculateDeliveryCharge, DELIVERY_TYPES } from "../utils/deliveryCharge.js";

const createCustomerNotificationSafely = async (payload) => {
  try {
    await createNotification(payload);
  } catch (error) {
    console.error("Customer order notification failed:", error);
  }
};
const generateOrderNumber = () => {
  return "FB-" + Date.now();
};
const calculateCommissionSnapshot = ({
  price,
  quantity,
  commissionType,
  commissionValue,
}) => {
  const safePrice = Number(price || 0);
  const safeQuantity = Math.max(Number(quantity || 1), 1);
  const subtotal = safePrice * safeQuantity;

  const type = commissionType || "PERCENTAGE";
  const value = Math.max(Number(commissionValue || 0), 0);

  let commissionAmount = 0;

  if (type === "PERCENTAGE") {
    commissionAmount = (subtotal * value) / 100;
  } else if (type === "FIXED") {
    // Fixed commission is applied once per order-item line,
    // not multiplied by quantity.
     commissionAmount = value * safeQuantity;
  }

  // Commission cannot be greater than the item subtotal.
  commissionAmount = Math.min(
    Math.max(commissionAmount, 0),
    subtotal
  );

  const vendorEarning = subtotal - commissionAmount;

  return {
    subtotal,
    commissionType: type,
    commissionValue: value,
    commissionAmount,
    platformEarning: commissionAmount,
    vendorEarning,
  };
};

const calculateOrderFinancials = (items = []) => {
  if (!Array.isArray(items)) {
    return {
      productTotal: 0,
      deliveryFee: 0,
      grandTotal: 0,
      totalCommission: 0,
      totalPlatformEarning: 0,
      totalVendorEarning: 0,
    };
  }

  const financials = items.reduce(
    (result, item) => {
      const itemStatus = String(
        item?.itemStatus || "PENDING"
      ).toUpperCase();

      const isCancelled =
        itemStatus === "CANCELLED";

      const price = Number(
        item?.price || 0
      );

      const quantity = Math.max(
        Number(item?.quantity || 0),
        0
      );

      const subtotal =
        price * quantity;

      /*
       * Product থেকে order তৈরির সময় save করা
       * historical delivery charge snapshot।
       */
      const itemDeliveryCharge = Number(
        item?.deliveryCharge || 0
      );

      /*
       * shippedAt থাকলে বুঝবো item একবার shipment-এ
       * চলে গিয়েছিল।
       *
       * পরে status CANCELLED হলেও delivery cost থাকবে।
       */
      const wasShipped =
        Boolean(item?.shippedAt);

      const commissionAmount = Number(
        item?.platformEarning ??
          item?.commissionAmount ??
          0
      );

      const vendorEarning = Number(
        item?.vendorEarning ??
          Math.max(
            subtotal - commissionAmount,
            0
          )
      );

      /*
       * Cancelled item-এর product value,
       * commission এবং vendor earning বাদ।
       */
      if (!isCancelled) {
        result.productTotal +=
          subtotal;

        result.totalCommission +=
          commissionAmount;

        result.totalPlatformEarning +=
          commissionAmount;

        result.totalVendorEarning +=
          vendorEarning;
      }

      /*
       * Active item হলে delivery charge থাকবে।
       *
       * Cancelled item হলেও shipment-এর পরে cancel
       * হয়ে থাকলে delivery charge থাকবে।
       */
      const deliveryApplicable =
        !isCancelled || wasShipped;

      if (deliveryApplicable) {
        result.deliveryFee +=
          itemDeliveryCharge;
      }

      return result;
    },
    {
      productTotal: 0,
      deliveryFee: 0,
      grandTotal: 0,
      totalCommission: 0,
      totalPlatformEarning: 0,
      totalVendorEarning: 0,
    }
  );

  financials.grandTotal =
    financials.productTotal +
    financials.deliveryFee;

  return financials;
};

export const createOrder = async (req, res) => {
  try {
    const {
      customerId,
      customerName,
      phone,
      address,
      district,
      upazila,
      deliverySelections,
      customerNote: rawCustomerNote,
    } = req.body;

    const customerNote =
      typeof rawCustomerNote === "string"
        ? rawCustomerNote.trim()
        : "";

    const orderUserId =
      req.user.role === "CUSTOMER"
        ? req.user.id
        : customerId;

    if (!orderUserId) {
      return res.status(400).json({
        success: false,
        message: "Customer ID is required",
      });
    }

    if (!customerName) {
      return res.status(400).json({
        success: false,
        message: "Customer name is required",
      });
    }

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    if (!address) {
      return res.status(400).json({
        success: false,
        message: "Address is required",
      });
    }

    if (!district) {
      return res.status(400).json({
        success: false,
        message: "District is required",
      });
    }

    if (customerNote.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Order note cannot exceed 500 characters",
      });
    }

    const customer =
      await prisma.user.findUnique({
        where: {
          id: orderUserId,
        },
      });

    if (
      !customer ||
      customer.role !== "CUSTOMER"
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid customer not found",
      });
    }

    const cart =
      await prisma.cart.findUnique({
        where: {
          userId: orderUserId,
        },

        include: {
          items: {
            include: {
              product: {
                include: {
                  vendor: true,
                },
              },
            },
          },
        },
      });

    if (
      !cart ||
      cart.items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    if (!Array.isArray(deliverySelections)) {
      return res.status(400).json({
        success: false,
        message: "Delivery option is required for every cart item",
      });
    }

    const deliverySelectionMap = new Map();

    for (const selection of deliverySelections) {
      const cartItemId = String(selection?.cartItemId || "");
      const deliveryType = String(selection?.deliveryType || "").toUpperCase();

      if (
        !cartItemId ||
        deliverySelectionMap.has(cartItemId) ||
        !Object.values(DELIVERY_TYPES).includes(deliveryType)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid delivery selection",
        });
      }

      deliverySelectionMap.set(cartItemId, deliveryType);
    }

    const cartItemIds = new Set(cart.items.map((item) => item.id));
    const hasUnexpectedSelection = [...deliverySelectionMap.keys()].some(
      (itemId) => !cartItemIds.has(itemId)
    );

    if (
      hasUnexpectedSelection ||
      deliverySelectionMap.size !== cart.items.length
    ) {
      return res.status(400).json({
        success: false,
        message: "Delivery option is required for every cart item",
      });
    }

    let productTotal = 0;
    let totalDeliveryFee = 0;

    /*
     * আগে সব item prepare করবো।
     * তারপর transaction-এর ভিতরে order create করবো।
     */
    const preparedOrderItems = [];

    for (const cartItem of cart.items) {
      const product =
        cartItem.product;

      if (
        product.status !== "APPROVED"
      ) {
        return res.status(400).json({
          success: false,
          message: `${product.name} is not available`,
        });
      }

      if (
        product.stock <
        cartItem.quantity
      ) {
        return res.status(400).json({
          success: false,
          message: `${product.name} stock not available`,
        });
      }

      const commissionType = product.commissionType ||
        (product.vendor?.defaultCommissionActive !== false && (!product.vendor?.defaultCommissionEffectiveFrom || product.vendor.defaultCommissionEffectiveFrom <= new Date())
          ? product.vendor?.defaultCommissionType : null);
      const commissionValue = product.commissionValue ??
        (product.vendor?.defaultCommissionActive !== false && (!product.vendor?.defaultCommissionEffectiveFrom || product.vendor.defaultCommissionEffectiveFrom <= new Date())
          ? product.vendor?.defaultCommissionValue : null);

      if (!commissionType || commissionValue === null || commissionValue === undefined) {
        return res.status(400).json({
          success: false,
          message: `${product.name} does not have an approved commission`,
        });
      }

      /*
       * salePrice থাকলে salePrice,
       * না থাকলে regular price।
       */
      const price = Number(
        product.salePrice ??
          product.price ??
          0
      );

      const quantity = Number(
        cartItem.quantity || 0
      );

      const subtotal =
        price * quantity;

      /*
       * Delivery charge প্রতি OrderItem line-এ
       * একবার যোগ হবে।
       *
       * quantity 3 হলেও delivery charge
       * 3 দিয়ে multiply হবে না।
       */
      const deliveryType = deliverySelectionMap.get(cartItem.id);
      const itemDeliveryCharge = calculateDeliveryCharge(
        product,
        deliveryType
      );

      const commission =
        calculateCommissionSnapshot({
          price,
          quantity,

          commissionType,

          commissionValue,
        });

      productTotal += subtotal;

      totalDeliveryFee +=
        itemDeliveryCharge;

      preparedOrderItems.push({
        productId:
          cartItem.productId,

        vendorId:
          product.vendorId,

        quantity,
        price,

        size:
          cartItem.size,

        color:
          cartItem.color,

        /*
         * Product থেকে delivery charge snapshot।
         */
        deliveryCharge:
          itemDeliveryCharge,

        deliveryType,

        /*
         * Order তৈরি হওয়ার সময় এখনো ship হয়নি।
         */
        shippedAt: null,

        commissionType:
          commission.commissionType,

        commissionValue:
          commission.commissionValue,

        commissionAmount:
          commission.commissionAmount,

        platformEarning:
          commission.platformEarning,

        vendorEarning:
          commission.vendorEarning,
      });
    }

    /*
     * Order Grand Total:
     *
     * সব item product subtotal
     * + সব item delivery charge
     */
    const grandTotal =
      productTotal +
      totalDeliveryFee;

    const order =
      await prisma.$transaction(
        async (tx) => {
          const newOrder =
            await tx.order.create({
              data: {
                orderNumber:
                  generateOrderNumber(),

                userId:
                  orderUserId,

                createdById:
                  req.user.id,

                createdByRole:
                  req.user.role,

                source:
                  req.user.role ===
                  "CUSTOMER"
                    ? "CUSTOMER"
                    : `${req.user.role}_MANUAL`,

                /*
                 * Order.deliveryFee হলো
                 * সব item delivery charge-এর total।
                 */
                deliveryFee:
                  totalDeliveryFee,

                /*
                 * totalAmount হলো Grand Total।
                 */
                totalAmount:
                  grandTotal,

                paymentMethod:
                  "COD",

                paymentStatus:
                  "UNPAID",

                orderStatus:
                  "PENDING",

                customerName,
                phone,
                address,
                district,
                upazila,

                items: {
                  create:
                    preparedOrderItems,
                },
              },

              include: {
                items: {
                  include: {
                    product: {
                      select: {
                        id: true,
                        name: true,
                        slug: true,

                        images: {
                          where: {
                            isMain: true,
                          },

                          select: {
                            url: true,
                          },

                          take: 1,
                        },
                      },
                    },

                    vendor: {
                      select: {
                        id: true,
                        shopName: true,
                        shopSlug: true,
                      },
                    },
                  },
                },
              },
            });

          if (customerNote) {
            await tx.orderNote.create({
              data: {
                orderId: newOrder.id,
                userId: orderUserId,
                note: customerNote,
                noteType: "CUSTOMER_NOTE",
                visibleToCustomer: true,
              },
            });
          }

          await tx.cartItem.deleteMany({
            where: {
              cartId: cart.id,
            },
          });

          return newOrder;
        }
      );

    await createNotification({
      userId: order.userId,

      title: "Order Created",

      message: `Your order ${order.orderNumber} has been placed successfully.`,

      type: "ORDER_CREATED",

      link: `/customer/orders/${order.id}`,
    });

    await createActivityLog({
      userId: req.user.id,

      action: "ORDER_CREATED",

      entityType: "ORDER",

      entityId: order.id,

      oldData: null,

      newData: {
        orderNumber:
          order.orderNumber,

        productTotal,

        deliveryFee:
          order.deliveryFee,

        totalAmount:
          order.totalAmount,

        source:
          order.source,
      },

      req,
    });

    return res.status(201).json({
      success: true,
      message:
        "Order created successfully",

      order: {
        ...order,

        /*
         * Frontend ও Postman-এর সুবিধার জন্য।
         */
        productTotal,
        deliveryFee:
          totalDeliveryFee,
        grandTotal,
      },
    });
  } catch (error) {
    console.error(
      "Create order error:",
      error
    );

    return res.status(400).json({
      success: false,

      message:
        error.message ||
        "Order creation failed",
    });
  }
};
export const getMyOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        userId: req.user.id,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: {
        id,
      },

      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },

        createdBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },

        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                salePrice: true,

                images: {
                  where: {
                    isMain: true,
                  },
                  select: {
                    url: true,
                  },
                  take: 1,
                },
              },
            },

            vendor: {
              select: {
                id: true,
                shopName: true,
                shopSlug: true,
              },
            },
          },
        },

        notes: {
          where: {
            noteType: "CUSTOMER_NOTE",
          },
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            note: true,
            noteType: true,
            createdAt: true,
          },
        },

        timelines: {
          orderBy: {
            createdAt: "asc",
          },

          select: {
            id: true,
            orderId: true,
            itemId: true,
            title: true,
            details: true,
            type: true,
            createdAt: true,

            user: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },

            item: {
              select: {
                id: true,
                itemStatus: true,

                product: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const isOwner =
      order.userId === req.user.id;

    const isAdmin =
      req.user.role === "ADMIN" ||
      req.user.role === "SUPER_ADMIN" ||
      req.user.role === "SUPPORT_AGENT";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    return res.status(200).json({
      success: true,

      order: {
        ...order,

        // Frontend বর্তমানে order.timeline ব্যবহার করছে।
        timeline: order.timelines || [],
      },
    });
  } catch (error) {
    console.error(
      "Get order details error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to get order details",
    });
  }
};



export const getAllOrdersForAdmin = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);

    const limit = Math.min(
      Math.max(Number(req.query.limit) || 10, 1),
      100
    );

    const skip = (page - 1) * limit;

    const search = String(
      req.query.search || ""
    ).trim();

    const status = String(
      req.query.status || ""
    )
      .trim()
      .toUpperCase();

    const paymentStatus = String(
      req.query.paymentStatus || ""
    )
      .trim()
      .toUpperCase();

    const sort =
      String(req.query.sort || "").toLowerCase() ===
      "oldest"
        ? "asc"
        : "desc";

    /*
     * এই where শুধু table search/filter-এর জন্য।
     * উপরের lifetime cards এই filter দ্বারা বদলাবে না।
     */
    const where = {
      ...(status
        ? {
            orderStatus: status,
          }
        : {}),

      ...(paymentStatus
        ? {
            paymentStatus,
          }
        : {}),

      ...(search
        ? {
            OR: [
              {
                orderNumber: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                customerName: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                phone: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                user: {
                  name: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
              {
                user: {
                  email: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
              {
                items: {
                  some: {
                    product: {
                      name: {
                        contains: search,
                        mode: "insensitive",
                      },
                    },
                  },
                },
              },
              {
                items: {
                  some: {
                    vendor: {
                      shopName: {
                        contains: search,
                        mode: "insensitive",
                      },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [
      orders,
      filteredTotalOrders,
      lifetimeTotalOrders,
      lifetimeFinancialItems,
    ] = await Promise.all([
      /*
       * Paginated table orders
       */
      prisma.order.findMany({
        where,
        skip,
        take: limit,

        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },

          createdBy: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },

          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,

                  images: {
                    where: {
                      isMain: true,
                    },
                    select: {
                      url: true,
                    },
                    take: 1,
                  },
                },
              },

              vendor: {
                select: {
                  id: true,
                  shopName: true,
                  shopSlug: true,
                },
              },
            },
          },
        },

        orderBy: {
          createdAt: sort,
        },
      }),

      /*
       * Search/filter অনুযায়ী table total
       */
      prisma.order.count({
        where,
      }),

      /*
       * Lifetime Total Orders card
       */
      prisma.order.count(),

      /*
       * Lifetime financial stats।
       * Cancelled item বাদ থাকবে।
       */
      prisma.orderItem.findMany({
        where: {
          itemStatus: {
            not: "CANCELLED",
          },
        },

        select: {
          price: true,
          quantity: true,
          commissionAmount: true,
          platformEarning: true,
          vendorEarning: true,
        },
      }),
    ]);

    /*
     * Admin lifetime financial cards
     */
    const lifetimeStats =
      lifetimeFinancialItems.reduce(
        (result, item) => {
          const price = Number(item.price || 0);
          const quantity = Number(
            item.quantity || 0
          );

          const subtotal = price * quantity;

          const commission = Number(
            item.platformEarning ??
              item.commissionAmount ??
              0
          );

          /*
           * পুরোনো order-এ vendorEarning null হলে:
           * subtotal - commission fallback হবে।
           */
          const vendorEarning = Number(
            item.vendorEarning ??
              Math.max(
                subtotal - commission,
                0
              )
          );

          result.grossProductSales +=
            subtotal;

          result.totalCommission +=
            commission;

          result.totalVendorEarnings +=
            vendorEarning;

          return result;
        },
        {
          grossProductSales: 0,
          totalCommission: 0,
          totalVendorEarnings: 0,
        }
      );

    /*
     * প্রতিটি table order-এর financial summary
     */
    const formattedOrders = orders.map(
      (order) => {
        const activeItems =
          order.items.filter(
            (item) =>
              String(
                item.itemStatus || ""
              ).toUpperCase() !==
              "CANCELLED"
          );

        const financialSummary =
          activeItems.reduce(
            (result, item) => {
              const price = Number(
                item.price || 0
              );

              const quantity = Number(
                item.quantity || 0
              );

              const subtotal =
                price * quantity;

              const commission = Number(
                item.platformEarning ??
                  item.commissionAmount ??
                  0
              );

              const vendorEarning =
                Number(
                  item.vendorEarning ??
                    Math.max(
                      subtotal -
                        commission,
                      0
                    )
                );

              result.productTotal +=
                subtotal;

              result.totalCommission +=
                commission;

              result.totalVendorEarning +=
                vendorEarning;

              return result;
            },
            {
              productTotal: 0,
              totalCommission: 0,
              totalVendorEarning: 0,
            }
          );

        const formattedItems =
          order.items.map((item) => {
            const price = Number(
              item.price || 0
            );

            const quantity = Number(
              item.quantity || 0
            );

            const subtotal =
              price * quantity;

            const commissionAmount =
              Number(
                item.commissionAmount ??
                  item.platformEarning ??
                  0
              );

            const platformEarning =
              Number(
                item.platformEarning ??
                  item.commissionAmount ??
                  0
              );

            const vendorEarning =
              Number(
                item.vendorEarning ??
                  Math.max(
                    subtotal -
                      platformEarning,
                    0
                  )
              );

            return {
              ...item,

              price,
              quantity,
              subtotal,

              commissionValue: Number(
                item.commissionValue || 0
              ),

              commissionAmount,
              platformEarning,
              vendorEarning,

              financialEligible:
                String(
                  item.itemStatus || ""
                ).toUpperCase() !==
                "CANCELLED",
            };
          });

        return {
          ...order,

          /*
           * Admin table fields
           */
          productTotal:
            financialSummary.productTotal,

          totalCommission:
            financialSummary.totalCommission,

          totalVendorEarning:
            financialSummary.totalVendorEarning,

          /*
           * Compatibility alias
           */
          vendorEarning:
            financialSummary.totalVendorEarning,

          itemCount: order.items.length,

          image:
            order.items[0]?.product
              ?.images?.[0]?.url ||
            null,

          items: formattedItems,
        };
      }
    );

    return res.status(200).json({
      success: true,

      orders: formattedOrders,

      /*
       * Lifetime admin cards।
       * Search/filter/pagination এগুলো বদলাবে না।
       */
      stats: {
        totalOrders:
          lifetimeTotalOrders,

        grossProductSales:
          lifetimeStats.grossProductSales,

        totalCommission:
          lifetimeStats.totalCommission,

        totalVendorEarnings:
          lifetimeStats.totalVendorEarnings,
      },

      pagination: {
        total: filteredTotalOrders,
        page,
        limit,
        totalPages: Math.max(
          Math.ceil(
            filteredTotalOrders / limit
          ),
          1
        ),
      },
    });
  } catch (error) {
    console.error(
      "Get admin orders error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to get admin orders",
    });
  }
};

const validateOrderPaymentStatus = (orderStatus, paymentStatus) => {
  if (["DELIVERED", "COMPLETED"].includes(orderStatus) && paymentStatus !== "PAID") {
    return "Delivered/Completed order must be PAID";
  }

  if (orderStatus === "CANCELLED" && paymentStatus === "PAID") {
    return "Cancelled COD order should not be PAID";
  }

  return null;
};
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus, paymentStatus } = req.body;

    const allowedOrderStatus = [
      "PENDING",
      "CONFIRMED",
      "PROCESSING",
      "SHIPPED",
      "DELIVERED",
      "COMPLETED",
      "CANCELLED",
      "RETURNED",
      "REFUNDED",
    ];

    const allowedPaymentStatus = ["UNPAID", "PAID"];

    const updateData = {};

    if (orderStatus) {
      if (!allowedOrderStatus.includes(orderStatus)) {
        return res.status(400).json({
          success: false,
          message: "Invalid order status",
        });
      }

      updateData.orderStatus = orderStatus;
    }

    if (paymentStatus) {
      if (!allowedPaymentStatus.includes(paymentStatus)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment status",
        });
      }

      updateData.paymentStatus = paymentStatus;
    }
    const oldOrder = await prisma.order.findUnique({
      where: { id },
    });
    if (!oldOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }
    const finalOrderStatus = orderStatus || oldOrder.orderStatus;
    const finalPaymentStatus = paymentStatus || oldOrder.paymentStatus;

    const validationError = validateOrderPaymentStatus(
      finalOrderStatus,
      finalPaymentStatus
    );

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }
const order = await prisma.$transaction(async (tx) => {
  const items = await tx.orderItem.findMany({
    where: {
      orderId: id,
    },
    include: {
      product: true,
    },
  });

  /*
   * Whole order CONFIRMED
   *
   * শুধু যেসব item-এর stock আগে কমেনি
   * সেগুলোর stock কমবে।
   */
  if (
    orderStatus === "CONFIRMED" &&
    oldOrder.orderStatus !== "CONFIRMED"
  ) {
    for (const item of items) {
      if (
        item.itemStatus === "CANCELLED" ||
        item.stockReduced
      ) {
        continue;
      }

      const variant =
        await tx.productVariant.findFirst({
          where: {
            productId: item.productId,
            size: item.size || null,
            color: item.color || null,
          },
        });

      if (variant) {
        if (variant.stock < item.quantity) {
          throw new Error(
            `${item.product.name} variant stock not available`
          );
        }

        if (item.product.stock < item.quantity) {
          throw new Error(
            `${item.product.name} stock not available`
          );
        }

        await tx.productVariant.update({
          where: {
            id: variant.id,
          },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });

        await tx.product.update({
          where: {
            id: item.productId,
          },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      } else {
        if (item.product.stock < item.quantity) {
          throw new Error(
            `${item.product.name} stock not available`
          );
        }

        await tx.product.update({
          where: {
            id: item.productId,
          },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      await tx.orderItem.update({
        where: {
          id: item.id,
        },
        data: {
          stockReduced: true,
        },
      });

      await tx.orderTimeline.create({
        data: {
          orderId: id,
          itemId: item.id,
          userId: req.user.id,
          title: "Stock deducted",
          details: `${item.quantity} quantity deducted for ${item.product.name}`,
          type: "STOCK",
        },
      });
    }
  }

  /*
   * Whole order CANCELLED
   *
   * শুধু আগে stock কমানো item-এর stock ফেরত যাবে।
   */
  if (
    orderStatus === "CANCELLED" &&
    oldOrder.orderStatus !== "CANCELLED"
  ) {
    for (const item of items) {
      if (!item.stockReduced) {
        continue;
      }

      const variant =
        await tx.productVariant.findFirst({
          where: {
            productId: item.productId,
            size: item.size || null,
            color: item.color || null,
          },
        });

      if (variant) {
        await tx.productVariant.update({
          where: {
            id: variant.id,
          },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        });

        await tx.product.update({
          where: {
            id: item.productId,
          },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        });
      } else {
        await tx.product.update({
          where: {
            id: item.productId,
          },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        });
      }

      await tx.orderItem.update({
        where: {
          id: item.id,
        },
        data: {
          stockReduced: false,
        },
      });

      await tx.orderTimeline.create({
        data: {
          orderId: id,
          itemId: item.id,
          userId: req.user.id,
          title: "Stock returned",
          details: `${item.quantity} quantity returned for ${item.product.name}`,
          type: "STOCK",
        },
      });
    }
  }

  return tx.order.update({
    where: {
      id,
    },
    data: updateData,
    include: {
      items: true,
    },
  });
});
    const isOrderStatusChanged = oldOrder.orderStatus !== order.orderStatus;
    const isPaymentStatusChanged = oldOrder.paymentStatus !== order.paymentStatus;
    let notificationTitle = "Order Updated";
    let notificationMessage = `Your order ${order.orderNumber} has been updated.`;

    switch (order.orderStatus) {
      case "CONFIRMED":
        notificationTitle = "Order Confirmed";
        notificationMessage = `Your order ${order.orderNumber} has been confirmed.`;
        break;

      case "PROCESSING":
        notificationTitle = "Order Processing";
        notificationMessage = `Your order ${order.orderNumber} is now processing.`;
        break;

      case "SHIPPED":
        notificationTitle = "Order Shipped";
        notificationMessage = `Your order ${order.orderNumber} has been shipped.`;
        break;

      case "DELIVERED":
        notificationTitle = "Order Delivered";
        notificationMessage = `Your order ${order.orderNumber} has been delivered.`;
        break;

      case "COMPLETED":
        notificationTitle = "Order Completed";
        notificationMessage = `Your order ${order.orderNumber} has been completed.`;
        break;

      case "RETURNED":
        notificationTitle = "Order Returned";
        notificationMessage = `Your order ${order.orderNumber} has been returned.`;
        break;

      case "REFUNDED":
        notificationTitle = "Order Refunded";
        notificationMessage = `Refund processed for order ${order.orderNumber}.`;
        break;

      case "CANCELLED":
        notificationTitle = "Order Cancelled";
        notificationMessage = `Your order ${order.orderNumber} has been cancelled.`;
        break;
    }
    if (isOrderStatusChanged || isPaymentStatusChanged) {
      let action = "ORDER_UPDATED";

      if (isOrderStatusChanged && isPaymentStatusChanged) {
        action = "ORDER_AND_PAYMENT_UPDATED";
      } else if (isOrderStatusChanged) {
        action = "ORDER_STATUS_UPDATED";
      } else if (isPaymentStatusChanged) {
        action = "PAYMENT_STATUS_UPDATED";
      }
      await createCustomerNotificationSafely({
        userId: order.userId,
        title: notificationTitle,
        message: notificationMessage,
        type: action,
        link: "/dashboard/orders/" + order.id,
      });

      await createActivityLog({
        userId: req.user.id,
        action,
        entityType: "ORDER",
        entityId: order.id,
        oldData: {
          orderStatus: oldOrder.orderStatus,
          paymentStatus: oldOrder.paymentStatus,
        },
        newData: {
          orderStatus: order.orderStatus,
          paymentStatus: order.paymentStatus,
        },
        req,
      });
    }

    res.json({
      success: true,
      message: "Order status updated successfully",
      order,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
export const cancelMyOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order || order.userId !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.orderStatus !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Only pending order can be cancelled",
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        orderStatus: "CANCELLED",
      },
    });
    await createNotification({
      userId: updatedOrder.userId,
      title: "Order Cancelled",
      message: `Order ${updatedOrder.orderNumber} has been cancelled.`,
      type: "ORDER_CANCELLED",
      link: `/customer/orders/${updatedOrder.id}`,
    });
    await createActivityLog({
      userId: req.user.id,
      action: "ORDER_CANCELLED",
      entityType: "ORDER",
      entityId: updatedOrder.id,
      oldData: {
        orderStatus: order.orderStatus,
      },
      newData: {
        orderStatus: updatedOrder.orderStatus,
      },
      req,
    });

    res.json({
      success: true,
      message: "Order cancelled successfully",
      order: updatedOrder,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const cancelPendingOrderItemByCustomer = async (req, res) => {
  try {
    const { itemId } = req.params;
    const reason = String(req.body.reason || "").trim();

    if (reason.length < 5) {
      return res.status(400).json({
        success: false,
        message: "Cancellation reason must be at least 5 characters",
      });
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const item = await tx.orderItem.findUnique({
          where: { id: itemId },
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
            order: {
              select: {
                id: true,
                orderNumber: true,
                userId: true,
              },
            },
          },
        });

        if (!item || item.order.userId !== req.user.id) {
          throw new Error("Order item not found for this customer");
        }

        if (String(item.itemStatus).toUpperCase() !== "PENDING") {
          throw new Error("Only pending items can be cancelled");
        }

        const updatedItem = await tx.orderItem.update({
          where: { id: itemId },
          data: {
            itemStatus: "CANCELLED",
          },
        });

        await tx.orderTimeline.create({
          data: {
            orderId: item.orderId,
            itemId: item.id,
            userId: req.user.id,
            title: "Item Cancelled by Customer",
            details: `${item.product.name} cancelled by customer. Reason: ${reason}`,
            type: "STATUS",
          },
        });

        const updatedOrder = await syncMainOrderStatusFromItems(
          item.orderId,
          tx
        );

        return {
          updatedItem,
          updatedOrder,
          orderNumber: item.order.orderNumber,
        };
      },
      {
        maxWait: 10000,
        timeout: 20000,
      }
    );

    await createActivityLog({
      userId: req.user.id,
      action: "CUSTOMER_ORDER_ITEM_CANCELLED",
      entityType: "ORDER_ITEM",
      entityId: result.updatedItem.id,
      oldData: {
        itemStatus: "PENDING",
      },
      newData: {
        itemStatus: "CANCELLED",
        orderStatus: result.updatedOrder.orderStatus,
        reason,
      },
      req,
    });

    return res.json({
      success: true,
      message: "Pending item cancelled successfully",
      item: result.updatedItem,
      order: result.updatedOrder,
    });
  } catch (error) {
    console.error("Customer pending item cancellation error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateOrderByAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      orderStatus,
      paymentStatus,
      customerName,
      phone,
      address,
      district,
      upazila,
      deliveryFee,
    } = req.body;

    const updateData = {};

    if (orderStatus) updateData.orderStatus = orderStatus;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (customerName) updateData.customerName = customerName;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = address;
    if (district) updateData.district = district;
    if (upazila) updateData.upazila = upazila;
    if (deliveryFee !== undefined) updateData.deliveryFee = deliveryFee;

    const oldOrder = await prisma.order.findUnique({
      where: { id },
    });
    if (!oldOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }
    const finalOrderStatus = orderStatus || oldOrder.orderStatus;
    const finalPaymentStatus = paymentStatus || oldOrder.paymentStatus;

    const validationError = validateOrderPaymentStatus(
      finalOrderStatus,
      finalPaymentStatus
    );

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }
    const order = await prisma.order.update({
      where: { id },
      data: updateData,
    });
    const changedFields = {};

    const fieldsToCheck = [
      "customerName",
      "phone",
      "address",
      "district",
      "upazila",
      "deliveryFee",
      "orderStatus",
      "paymentStatus",
    ];

    for (const field of fieldsToCheck) {
      if (oldOrder[field] !== order[field]) {
        changedFields[field] = {
          old: oldOrder[field],
          new: order[field],
        };
      }
    }

    if (Object.keys(changedFields).length > 0) {
      await createActivityLog({
        userId: req.user.id,
        action: "ORDER_UPDATED_BY_ADMIN",
        entityType: "ORDER",
        entityId: order.id,
        oldData: oldOrder,
        newData: changedFields,
        req,
      });
    }
    res.json({
      success: true,
      message: "Order updated successfully",
      order,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
export const deleteOrderBySuperAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.order.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
export const createManualOrder = async (req, res) => {
  try {
    const {
      customerId,
      customerName,
      phone,
      address,
      district,
      upazila,
      deliveryFee = 0,
      items,
    } = req.body;

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: "Customer ID is required",
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order items are required",
      });
    }

    const customer = await prisma.user.findUnique({
      where: { id: customerId },
    });

    if (!customer || customer.role !== "CUSTOMER") {
      return res.status(400).json({
        success: false,
        message: "Valid customer not found",
      });
    }

    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { vendor: true },
      });

      if (!product || product.status !== "APPROVED") {
        return res.status(400).json({
          success: false,
          message: "Product not available",
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `${product.name} stock not available`,
        });
      }

const price =
  product.salePrice || product.price;

const commissionType = product.commissionType ||
  (product.vendor?.defaultCommissionActive !== false && (!product.vendor?.defaultCommissionEffectiveFrom || product.vendor.defaultCommissionEffectiveFrom <= new Date())
    ? product.vendor?.defaultCommissionType : null);
const commissionValue = product.commissionValue ??
  (product.vendor?.defaultCommissionActive !== false && (!product.vendor?.defaultCommissionEffectiveFrom || product.vendor.defaultCommissionEffectiveFrom <= new Date())
    ? product.vendor?.defaultCommissionValue : null);

if (!commissionType || commissionValue === null || commissionValue === undefined) {
  return res.status(400).json({
    success: false,
    message: `${product.name} does not have an approved commission`,
  });
}

const commission =
  calculateCommissionSnapshot({
    price,
    quantity: item.quantity,
    commissionType,
    commissionValue,
  });

totalAmount += commission.subtotal;

orderItems.push({
  productId: product.id,
  vendorId: product.vendorId,
  quantity: item.quantity,
  price,
  size: item.size,
  color: item.color,

  commissionType:
    commission.commissionType,
  commissionValue:
    commission.commissionValue,
  commissionAmount:
    commission.commissionAmount,
  platformEarning:
    commission.platformEarning,
  vendorEarning:
    commission.vendorEarning,
});
    }

    const grandTotal = totalAmount + deliveryFee;

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber: "FB-" + Date.now(),
          userId: customerId,
          createdById: req.user.id,
          createdByRole: req.user.role,
          source: `${req.user.role}_MANUAL`,

          totalAmount: grandTotal,
          deliveryFee,
          paymentMethod: "COD",
          paymentStatus: "UNPAID",
          orderStatus: "PENDING",

          customerName,
          phone,
          address,
          district,
          upazila,

          items: {
            create: orderItems,
          },
        },
        include: {
          items: true,
        },
      });



      return newOrder;
    });
    await createNotification({
      userId: customerId,
      title: "Order Created",
      message: `Your order ${order.orderNumber} has been placed successfully.`,
      type: "ORDER_CREATED",
      link: `/customer/orders/${order.id}`,
    });
    await createActivityLog({
      userId: req.user.id,
      action: "MANUAL_ORDER_CREATED",
      entityType: "ORDER",
      entityId: order.id,
      oldData: null,
      newData: {
        orderNumber: order.orderNumber,
        customerId,
        totalAmount: order.totalAmount,
        source: order.source,
      },
      req,
    });
    res.status(201).json({
      success: true,
      message: "Manual order created successfully",
      order,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
export const getVendorOrders = async (req, res) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: {
        userId: req.user.id,
      },
      select: {
        id: true,
        shopName: true,
      },
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(
      Math.max(Number(req.query.limit) || 10, 1),
      100
    );
    const skip = (page - 1) * limit;

    const search = String(req.query.search || "").trim();

    const requestedStatus = String(
      req.query.status || "ALL"
    )
      .trim()
      .toUpperCase();

    const status = requestedStatus || "ALL";

    const sort =
      String(req.query.sort || "").toLowerCase() === "oldest"
        ? "asc"
        : "desc";

    /*
     * Search/filter শুধু table-এর data পরিবর্তন করবে।
     * Lifetime stats এই where ব্যবহার করবে না।
     */
    const itemWhere = {
      vendorId: vendor.id,

      ...(
        status !== "ALL" &&
        !status.startsWith("PARTIALLY_")
          ? {
              itemStatus: status,
            }
          : {}
      ),

      ...(search
        ? {
            OR: [
              {
                order: {
                  orderNumber: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
              {
                order: {
                  customerName: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
              {
                order: {
                  phone: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
              {
                product: {
                  name: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
              {
                id: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    };

    /*
     * Table data এবং lifetime card stats parallel-এ load হবে।
     *
     * completedEarnings:
     * শুধু COMPLETED item-এর vendorEarning।
     *
     * totalCommission:
     * সব non-cancelled item-এর platformEarning।
     *
     * lifetimeTotalOrders:
     * logged-in vendor-এর unique order count।
     */
    const [
      allVendorItems,
      completedEarningsResult,
      totalCommissionResult,
      lifetimeVendorOrders,
    ] = await Promise.all([
      prisma.orderItem.findMany({
        where: itemWhere,

        orderBy: {
          order: {
            createdAt: sort,
          },
        },

        select: {
          id: true,
          orderId: true,
          itemStatus: true,

          quantity: true,
          price: true,
          size: true,
          color: true,

          commissionType: true,
          commissionValue: true,
          commissionAmount: true,
          platformEarning: true,
          vendorEarning: true,

          order: {
            select: {
              id: true,
              orderNumber: true,
              createdAt: true,
              customerName: true,
              phone: true,
              paymentMethod: true,
              paymentStatus: true,

              user: {
                select: {
                  email: true,
                },
              },
            },
          },

          product: {
            select: {
              id: true,
              name: true,
              slug: true,

              images: {
                where: {
                  isMain: true,
                },
                select: {
                  url: true,
                },
                take: 1,
              },
            },
          },
        },
      }),

      prisma.orderItem.aggregate({
        where: {
          vendorId: vendor.id,
          itemStatus: "COMPLETED",
        },
        _sum: {
          vendorEarning: true,
        },
      }),

      prisma.orderItem.aggregate({
        where: {
          vendorId: vendor.id,
          itemStatus: {
            not: "CANCELLED",
          },
        },
        _sum: {
          platformEarning: true,
        },
      }),

      prisma.orderItem.findMany({
        where: {
          vendorId: vendor.id,
        },
        distinct: ["orderId"],
        select: {
          orderId: true,
        },
      }),
    ]);

    const groupedMap = new Map();

    for (const item of allVendorItems) {
      const orderId = item.order.id;

      if (!groupedMap.has(orderId)) {
        groupedMap.set(orderId, {
          orderId,
          orderNumber: item.order.orderNumber,
          createdAt: item.order.createdAt,

          customer: {
            name: item.order.customerName,
            phone: item.order.phone,
            email: item.order.user?.email || null,
          },

          customerName: item.order.customerName,
          phone: item.order.phone,

          paymentMethod: item.order.paymentMethod,
          paymentStatus: item.order.paymentStatus,

          items: [],

          productTotal: 0,
          totalCommission: 0,
          vendorEarning: 0,
        });
      }

      const orderGroup = groupedMap.get(orderId);

      const quantity = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      const subtotal = price * quantity;

      /*
       * Snapshot fields OrderItem থেকে নেওয়া হচ্ছে।
       * Frontend নতুন করে commission calculate করবে না।
       */
      const commissionAmount = Number(
        item.commissionAmount ??
          item.platformEarning ??
          0
      );

      const platformEarning = Number(
        item.platformEarning ??
          item.commissionAmount ??
          0
      );

      const vendorEarning = Number(
        item.vendorEarning ??
          Math.max(subtotal - platformEarning, 0)
      );

      const isCancelled =
        String(item.itemStatus || "").toUpperCase() ===
        "CANCELLED";

      orderGroup.items.push({
        id: item.id,
        orderId: item.orderId,

        itemStatus: item.itemStatus,

        quantity,
        price,
        subtotal,

        size: item.size,
        color: item.color,

        commissionType: item.commissionType,
        commissionValue: Number(
          item.commissionValue || 0
        ),
        commissionAmount,
        platformEarning,
        vendorEarning,

        /*
         * Cancelled item history table/detail-এ থাকবে,
         * কিন্তু financial totals-এ যোগ হবে না।
         */
        financialEligible: !isCancelled,

        product: item.product,
      });

      if (!isCancelled) {
        orderGroup.productTotal += subtotal;
        orderGroup.totalCommission += platformEarning;
        orderGroup.vendorEarning += vendorEarning;
      }
    }

    let formattedOrders = Array.from(
      groupedMap.values()
    ).map((order) => ({
      orderId: order.orderId,
      id: order.orderId,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,

      customer: order.customer,
      customerName: order.customerName,
      phone: order.phone,

      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,

      vendorStatus: getVendorStatusFromItems(
        order.items
      ),

      itemCount: order.items.length,

      /*
       * New clear financial fields
       */
      productTotal: order.productTotal,
      totalCommission: order.totalCommission,
      vendorEarning: order.vendorEarning,

      /*
       * Backward compatibility:
       * পুরোনো frontend vendorTotal পড়লেও
       * vendor earning-ই পাবে।
       */
      vendorTotal: order.vendorEarning,

      image:
        order.items[0]?.product?.images?.[0]?.url ||
        null,

      products: order.items.map((item) => ({
        itemId: item.id,
        productId: item.product?.id,
        name: item.product?.name,
        image:
          item.product?.images?.[0]?.url || null,

        quantity: item.quantity,
        itemStatus: item.itemStatus,

        subtotal: item.subtotal,
        commissionAmount:
          item.commissionAmount,
        platformEarning:
          item.platformEarning,
        vendorEarning: item.vendorEarning,
      })),

      items: order.items,
    }));

    /*
     * PARTIALLY_* status item query-তে সরাসরি নেই।
     * Grouping করার পরে calculated vendorStatus দিয়ে filter হবে।
     */
    if (status.startsWith("PARTIALLY_")) {
      formattedOrders = formattedOrders.filter(
        (order) =>
          order.vendorStatus === status
      );
    }

    const filteredTotalOrders =
      formattedOrders.length;

    const paginatedOrders =
      formattedOrders.slice(
        skip,
        skip + limit
      );

    const completedEarnings = Number(
      completedEarningsResult?._sum
        ?.vendorEarning || 0
    );

    const totalCommission = Number(
      totalCommissionResult?._sum
        ?.platformEarning || 0
    );

    const lifetimeTotalOrders =
      lifetimeVendorOrders.length;

    return res.status(200).json({
      success: true,

      /*
       * Existing frontend compatibility
       */
      totalOrders: filteredTotalOrders,
      totalItems: allVendorItems.length,
      currentPage: page,
      limit,
      totalPages: Math.max(
        Math.ceil(filteredTotalOrders / limit),
        1
      ),

      orders: paginatedOrders,

      /*
       * New lifetime vendor dashboard stats.
       * Search/filter/pagination এগুলো পরিবর্তন করবে না।
       */
      stats: {
        totalOrders: lifetimeTotalOrders,
        completedEarnings,
        totalCommission,
      },

      pagination: {
        total: filteredTotalOrders,
        page,
        limit,
        totalPages: Math.max(
          Math.ceil(filteredTotalOrders / limit),
          1
        ),
      },
    });
  } catch (error) {
    console.error(
      "Get vendor orders error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to get vendor orders",
    });
  }
};
export const updateVendorOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus } = req.body;

    const vendor = await prisma.vendor.findUnique({
      where: { userId: req.user.id },
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const order = await prisma.order.findFirst({
      where: {
        id,
        items: {
          some: { vendorId: vendor.id },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found for this vendor",
      });
    }

    const nextStatusMap = {
      PENDING: "CONFIRMED",
      CONFIRMED: "PROCESSING",
      PROCESSING: "SHIPPED",
    };

    const allowedNextStatus = nextStatusMap[order.orderStatus];

    if (!allowedNextStatus) {
      return res.status(400).json({
        success: false,
        message: "This order status is locked for vendor",
      });
    }

    if (orderStatus !== allowedNextStatus) {
      return res.status(400).json({
        success: false,
        message: `Vendor can only update ${order.orderStatus} to ${allowedNextStatus}`,
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { orderStatus },
      select: {
        id: true,
        orderNumber: true,
        orderStatus: true,
        createdAt: true,
      },
    });

    await createActivityLog({
      userId: req.user.id,
      action: "VENDOR_ORDER_STATUS_UPDATED",
      entityType: "ORDER",
      entityId: updatedOrder.id,
      oldData: { orderStatus: order.orderStatus },
      newData: { orderStatus: updatedOrder.orderStatus },
      req,
    });

    if (order.orderStatus !== updatedOrder.orderStatus) {
      const statusLabel = updatedOrder.orderStatus
        .toLowerCase()
        .replaceAll("_", " ");

      await createCustomerNotificationSafely({
        userId: order.userId,
        title: "Order " + statusLabel,
        message:
          "Your order " +
          updatedOrder.orderNumber +
          " is now " +
          statusLabel +
          ".",
        type: "ORDER_STATUS_UPDATED",
        link: "/dashboard/orders/" + updatedOrder.id,
      });
    }

    return res.json({
      success: true,
      message: "Vendor order status updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Vendor order status update error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const syncMainOrderStatusFromItems = async (
  orderId,
  prismaClient = prisma
) => {
  const items =
    await prismaClient.orderItem.findMany({
      where: {
        orderId,
      },

      select: {
        id: true,
        itemStatus: true,
        price: true,
        quantity: true,

        deliveryCharge: true,
        shippedAt: true,

        commissionAmount: true,
        platformEarning: true,
        vendorEarning: true,
      },
    });

  if (!items.length) {
    return null;
  }

  /*
   * RESHIPPED status main order calculation-এ
   * SHIPPED হিসেবে ধরা হবে।
   */
  const statuses = items.map((item) => {
    const status = String(
      item.itemStatus || "PENDING"
    ).toUpperCase();

    return status === "RESHIPPED"
      ? "SHIPPED"
      : status;
  });

  const allSame = statuses.every(
    (status) => status === statuses[0]
  );

  const completedItemCount = statuses.filter(
    (status) => status === "COMPLETED"
  ).length;

  const cancelledItemCount = statuses.filter(
    (status) => status === "CANCELLED"
  ).length;

  let newPaymentStatus = "UNPAID";

  if (completedItemCount > 0) {
    const allItemsSettled =
      completedItemCount + cancelledItemCount === statuses.length;

    newPaymentStatus = allItemsSettled
      ? "PAID"
      : "PARTIALLY_PAID";
  }

  let newOrderStatus = "PENDING";

  if (allSame) {
    newOrderStatus = statuses[0];
  } else if (
    statuses.includes("COMPLETED")
  ) {
    newOrderStatus =
      "PARTIALLY_COMPLETED";
  } else if (
    statuses.includes("DELIVERED")
  ) {
    newOrderStatus =
      "PARTIALLY_DELIVERED";
  } else if (
    statuses.includes("SHIPPED")
  ) {
    newOrderStatus =
      "PARTIALLY_SHIPPED";
  } else if (
    statuses.includes("PROCESSING")
  ) {
    newOrderStatus =
      "PARTIALLY_PROCESSING";
  } else if (
    statuses.includes("CONFIRMED")
  ) {
    newOrderStatus =
      "PARTIALLY_CONFIRMED";
  } else if (
    statuses.includes("CANCELLED")
  ) {
    newOrderStatus =
      "PARTIALLY_CANCELLED";
  }

  /*
   * Shared helper থেকে financial calculation।
   */
  const financials =
    calculateOrderFinancials(items);

  return prismaClient.order.update({
    where: {
      id: orderId,
    },

    data: {
      orderStatus:
        newOrderStatus,

      // completed + active items = PARTIALLY_PAID;
      // completed + cancelled items only = PAID;
      // all cancelled = UNPAID.
      paymentStatus: newPaymentStatus,

      /*
       * সব applicable item delivery charge-এর total।
       */
      deliveryFee:
        financials.deliveryFee,

      /*
       * Product Total + Delivery Fee
       */
      totalAmount:
        financials.grandTotal,
    },

    include: {
      items: true,
    },
  });
};

export const updateVendorOrderItemStatus = async (
  req,
  res
) => {
  try {
    const { itemId } = req.params;

    const itemStatus = String(
      req.body.itemStatus ||
        req.body.status ||
        ""
    ).toUpperCase();

    if (!itemStatus) {
      return res.status(400).json({
        success: false,
        message:
          "Item status is required",
      });
    }

    const vendor =
      await prisma.vendor.findUnique({
        where: {
          userId: req.user.id,
        },
      });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
          const item =
            await tx.orderItem.findFirst({
              where: {
                id: itemId,
                vendorId: vendor.id,
              },

              include: {
                product: true,
                order: {
                  select: {
                    id: true,
                    userId: true,
                    orderNumber: true,
                  },
                },
              },
            });

          if (!item) {
            throw new Error(
              "Order item not found"
            );
          }

          /*
           * Vendor normal forward flow:
           *
           * PENDING -> CONFIRMED
           * CONFIRMED -> PROCESSING
           * PROCESSING -> SHIPPED
           */
          const forwardNextStatusMap = {
            PENDING: "CONFIRMED",
            CONFIRMED: "PROCESSING",
            PROCESSING: "SHIPPED",
          };

          /*
           * Vendor cancel করতে পারবে:
           *
           * CONFIRMED
           * PROCESSING
           * SHIPPED
           *
           * SHIPPED-এর পরে cancel করলে shippedAt থাকবে,
           * তাই delivery charge applicable থাকবে।
           */
          const canCancelFrom = [
            "CONFIRMED",
            "PROCESSING",
            "SHIPPED",
          ];

          if (
            itemStatus === "CANCELLED"
          ) {
            if (
              !canCancelFrom.includes(
                item.itemStatus
              )
            ) {
              throw new Error(
                `You cannot cancel item from ${item.itemStatus}`
              );
            }
          } else {
            const nextStatus =
              forwardNextStatusMap[
                item.itemStatus
              ];

            if (!nextStatus) {
              throw new Error(
                "Item status is locked"
              );
            }

            if (
              itemStatus !== nextStatus
            ) {
              throw new Error(
                `You can only update ${item.itemStatus} to ${nextStatus}`
              );
            }
          }

          /*
           * Stock decrease:
           *
           * PENDING -> CONFIRMED
           */
          if (
            itemStatus === "CONFIRMED" &&
            !item.stockReduced
          ) {
            const variant =
              await tx.productVariant.findFirst(
                {
                  where: {
                    productId:
                      item.productId,

                    size:
                      item.size || null,

                    color:
                      item.color || null,
                  },
                }
              );

            if (variant) {
              if (
                variant.stock <
                item.quantity
              ) {
                throw new Error(
                  `${item.product.name} variant stock not available`
                );
              }

              await tx.productVariant.update({
                where: {
                  id: variant.id,
                },

                data: {
                  stock: {
                    decrement:
                      item.quantity,
                  },
                },
              });

              await tx.product.update({
                where: {
                  id: item.productId,
                },

                data: {
                  stock: {
                    decrement:
                      item.quantity,
                  },
                },
              });
            } else {
              if (
                item.product.stock <
                item.quantity
              ) {
                throw new Error(
                  `${item.product.name} stock not available`
                );
              }

              await tx.product.update({
                where: {
                  id: item.productId,
                },

                data: {
                  stock: {
                    decrement:
                      item.quantity,
                  },
                },
              });
            }

            await tx.orderTimeline.create({
              data: {
                orderId:
                  item.orderId,

                itemId:
                  item.id,

                userId:
                  req.user.id,

                title:
                  "Stock deducted",

                details: `${item.quantity} quantity deducted for ${item.product.name}`,

                type: "STOCK",
              },
            });
          }

          /*
           * Cancel হলে stock return।
           *
           * SHIPPED-এর পরেও cancel হলে stock return হবে,
           * কিন্তু shippedAt থাকবে।
           */
          if (
            itemStatus === "CANCELLED" &&
            item.stockReduced
          ) {
            const variant =
              await tx.productVariant.findFirst(
                {
                  where: {
                    productId:
                      item.productId,

                    size:
                      item.size || null,

                    color:
                      item.color || null,
                  },
                }
              );

            if (variant) {
              await tx.productVariant.update({
                where: {
                  id: variant.id,
                },

                data: {
                  stock: {
                    increment:
                      item.quantity,
                  },
                },
              });

              await tx.product.update({
                where: {
                  id: item.productId,
                },

                data: {
                  stock: {
                    increment:
                      item.quantity,
                  },
                },
              });
            } else {
              await tx.product.update({
                where: {
                  id: item.productId,
                },

                data: {
                  stock: {
                    increment:
                      item.quantity,
                  },
                },
              });
            }

            await tx.orderTimeline.create({
              data: {
                orderId:
                  item.orderId,

                itemId:
                  item.id,

                userId:
                  req.user.id,

                title:
                  "Stock returned",

                details: `${item.quantity} quantity returned for ${item.product.name}`,

                type: "STOCK",
              },
            });
          }

          /*
           * Update data আলাদা করে বানানো হচ্ছে,
           * যাতে shippedAt safely preserve করা যায়।
           */
          const itemUpdateData = {
            itemStatus,

            stockReduced:
              itemStatus === "CONFIRMED"
                ? true
                : itemStatus ===
                    "CANCELLED"
                  ? false
                  : item.stockReduced,
          };

          /*
           * প্রথমবার SHIPPED হলে shipment time save।
           *
           * কোনো কারণে আগেই shippedAt থাকলে
           * সেটি overwrite হবে না।
           */
          if (
            itemStatus === "SHIPPED"
          ) {
            itemUpdateData.shippedAt =
              item.shippedAt ||
              new Date();
          }

          /*
           * CANCELLED হলে shippedAt field update করছি না।
           *
           * ফলে:
           *
           * Pre-shipment cancel:
           * shippedAt = null
           *
           * Post-shipment cancel:
           * shippedAt = আগের date
           */
          const itemAfterUpdate =
            await tx.orderItem.update({
              where: {
                id: item.id,
              },

              data:
                itemUpdateData,
            });

          const timelineTitleMap = {
            CONFIRMED:
              "Item Confirmed",

            PROCESSING:
              "Processing Started",

            SHIPPED:
              "Item Shipped",

            CANCELLED:
              "Item Cancelled",
          };

          await tx.orderTimeline.create({
            data: {
              orderId:
                item.orderId,

              itemId:
                item.id,

              userId:
                req.user.id,

              title:
                timelineTitleMap[
                  itemStatus
                ] ||
                "Item Status Updated",

              details: `${item.product.name} changed from ${item.itemStatus} to ${itemStatus}`,

              type: "STATUS",
            },
          });

          /*
           * Main order status এবং financial total
           * একই transaction-এর মধ্যে recalculate হবে।
           */
          const updatedOrder =
            await syncMainOrderStatusFromItems(
              item.orderId,
              tx
            );

          return {
            oldItem: item,
            newItem:
              itemAfterUpdate,
            updatedOrder,
          };
        },
        {
          maxWait: 10000,
          timeout: 30000,
        }
      );

    await createActivityLog({
      userId:
        req.user.id,

      action:
        "VENDOR_ORDER_ITEM_STATUS_UPDATED",

      entityType:
        "ORDER_ITEM",

      entityId:
        result.newItem.id,

      oldData: {
        itemStatus:
          result.oldItem.itemStatus,

        stockReduced:
          result.oldItem.stockReduced,

        shippedAt:
          result.oldItem.shippedAt,

        deliveryCharge:
          result.oldItem.deliveryCharge,
      },

      newData: {
        itemStatus:
          result.newItem.itemStatus,

        stockReduced:
          result.newItem.stockReduced,

        shippedAt:
          result.newItem.shippedAt,

        deliveryFee:
          result.updatedOrder
            ?.deliveryFee,

        totalAmount:
          result.updatedOrder
            ?.totalAmount,

        orderStatus:
          result.updatedOrder
            ?.orderStatus,
      },

      req,
    });

    if (
      result.oldItem.itemStatus !== result.newItem.itemStatus
    ) {
      const statusLabel = result.newItem.itemStatus
        .toLowerCase()
        .replaceAll("_", " ");

      await createCustomerNotificationSafely({
        userId: result.oldItem.order.userId,
        title: "Order item " + statusLabel,
        message:
          result.oldItem.product.name +
          " in order " +
          result.oldItem.order.orderNumber +
          " is now " +
          statusLabel +
          ".",
        type: "ORDER_ITEM_STATUS_UPDATED",
        link: "/dashboard/orders/" + result.oldItem.order.id,
      });
    }

    return res.status(200).json({
      success: true,

      message:
        "Order item status updated successfully",

      item:
        result.newItem,

      order:
        result.updatedOrder,
    });
  } catch (error) {
    console.error(
      "Vendor order item status update error:",
      error
    );

    return res.status(400).json({
      success: false,

      message:
        error.message ||
        "Failed to update order item status",
    });
  }
};

const getVendorStatusFromItems = (
  items = []
) => {
  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return "PENDING";
  }

  const statuses = items.map(
    (item) =>
      item.itemStatus ===
      "RESHIPPED"
        ? "SHIPPED"
        : item.itemStatus
  );

  const uniqueStatuses = [
    ...new Set(statuses),
  ];

  if (uniqueStatuses.length === 1) {
    return uniqueStatuses[0];
  }

  /*
   * Mixed status হলে furthest progress
   * অনুযায়ী Vendor Status দেখাবে।
   */

  if (
    statuses.includes(
      "COMPLETED"
    )
  ) {
    return "PARTIALLY_COMPLETED";
  }

  if (
    statuses.includes(
      "DELIVERED"
    )
  ) {
    return "PARTIALLY_DELIVERED";
  }

  if (
    statuses.includes("SHIPPED")
  ) {
    return "PARTIALLY_SHIPPED";
  }

  if (
    statuses.includes(
      "PROCESSING"
    )
  ) {
    return "PARTIALLY_PROCESSING";
  }

  if (
    statuses.includes(
      "CONFIRMED"
    )
  ) {
    return "PARTIALLY_CONFIRMED";
  }

  if (
    statuses.includes(
      "CANCELLED"
    )
  ) {
    return "PARTIALLY_CANCELLED";
  }

  return "PENDING";
};



export const getVendorOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    const vendor = await prisma.vendor.findUnique({
      where: {
        userId: req.user.id,
      },
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,

        items: {
          some: {
            vendorId: vendor.id,
          },
        },
      },

      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
        paymentMethod: true,
        paymentStatus: true,

        notes: {
          where: {
            vendorId: vendor.id,
            noteType: "VENDOR_INTERNAL",
          },

          orderBy: {
            createdAt: "desc",
          },

          select: {
            id: true,
            note: true,
            noteType: true,
            visibleToCustomer: true,
            createdAt: true,

            user: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },

        timelines: {
          orderBy: {
            createdAt: "asc",
          },

          select: {
            id: true,
            title: true,
            details: true,
            type: true,
            createdAt: true,

            user: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },

        items: {
          where: {
            vendorId: vendor.id,
          },

          select: {
            id: true,
            itemStatus: true,

            returnStatus: true,
            deliveredAt: true,
            completedAt: true,
            returnRequestedAt: true,
            returnResolvedAt: true,

            quantity: true,
            price: true,
            size: true,
            color: true,
            stockReduced: true,

            /*
             * Commission snapshot fields
             */
            commissionType: true,
            commissionValue: true,
            commissionAmount: true,
            platformEarning: true,
            vendorEarning: true,

            vendor: {
              select: {
                id: true,
                shopName: true,
                shopSlug: true,
              },
            },

            product: {
              select: {
                id: true,
                name: true,
                slug: true,

                images: {
                  where: {
                    isMain: true,
                  },

                  select: {
                    url: true,
                  },

                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found for this vendor",
      });
    }

    const items = order.items.map((item) => {
      const price = Number(item.price || 0);
      const quantity = Number(item.quantity || 0);

      const subtotal = price * quantity;

      const commissionAmount = Number(
        item.commissionAmount ??
          item.platformEarning ??
          0
      );

      const platformEarning = Number(
        item.platformEarning ??
          item.commissionAmount ??
          0
      );

      /*
       * পুরোনো order-এ vendorEarning null হলে fallback।
       */
      const vendorEarning = Number(
        item.vendorEarning ??
          Math.max(
            subtotal - platformEarning,
            0
          )
      );

      const financialEligible =
        String(
          item.itemStatus || ""
        ).toUpperCase() !== "CANCELLED";

      return {
        ...item,

        price,
        quantity,
        subtotal,

        commissionValue: Number(
          item.commissionValue || 0
        ),

        commissionAmount,
        platformEarning,
        vendorEarning,
        financialEligible,
      };
    });

    /*
     * Cancelled item summary total-এ যোগ হবে না।
     */
    const financialSummary = items.reduce(
      (result, item) => {
        if (!item.financialEligible) {
          return result;
        }

        result.productTotal += Number(
          item.subtotal || 0
        );

        result.totalCommission += Number(
          item.platformEarning ||
            item.commissionAmount ||
            0
        );

        result.vendorEarning += Number(
          item.vendorEarning || 0
        );

        return result;
      },
      {
        productTotal: 0,
        totalCommission: 0,
        vendorEarning: 0,
      }
    );

    return res.status(200).json({
      success: true,

      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,

        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,

        vendorStatus:
          getVendorStatusFromItems(items),

        /*
         * Vendor financial summary
         */
        productTotal:
          financialSummary.productTotal,

        totalCommission:
          financialSummary.totalCommission,

        vendorEarning:
          financialSummary.vendorEarning,

        /*
         * Compatibility alias
         */
        vendorTotal:
          financialSummary.vendorEarning,

        items,

        notes: order.notes || [],

        timeline:
          order.timelines || [],
      },
    });
  } catch (error) {
    console.error(
      "Get vendor order details error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        error.message ||
        "Failed to get vendor order details",
    });
  }
};
export const addVendorOrderNote = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { note } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({
        success: false,
        message: "Note is required",
      });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { userId: req.user.id },
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        items: {
          some: {
            vendorId: vendor.id,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found for this vendor",
      });
    }

    const orderNote = await prisma.orderNote.create({
      data: {
        orderId: order.id,
        userId: req.user.id,
        vendorId: vendor.id,
        note: note.trim(),
        noteType: "VENDOR_INTERNAL",
        visibleToCustomer: false,
      },
    });
    await prisma.orderTimeline.create({
      data: {
        orderId: order.id,
        userId: req.user.id,
        title: "Vendor Internal Note",
        details: note.trim(),
        type: "NOTE",
      },
    });

    await createActivityLog({
      userId: req.user.id,
      action: "VENDOR_ORDER_NOTE_ADDED",
      entityType: "ORDER",
      entityId: order.id,
      oldData: null,
      newData: orderNote,
      req,
    });

    return res.status(201).json({
      success: true,
      message: "Note added successfully",
      note: orderNote,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
export const updateOrderItemStatusByAdmin = async (
  req,
  res
) => {
  try {
    const { itemId } = req.params;

    const itemStatus = String(
      req.body.itemStatus ||
        req.body.status ||
        ""
    ).toUpperCase();

    const cancellationReason = String(
      req.body.cancellationReason ||
        req.body.cancelReason ||
        req.body.reason ||
        ""
    ).trim();

    const allowedStatuses = [
      "CONFIRMED",
      "PROCESSING",
      "SHIPPED",
      "DELIVERED",
      "COMPLETED",
      "CANCELLED",
    ];

    if (!itemStatus) {
      return res.status(400).json({
        success: false,
        message: "Item status is required",
      });
    }

    if (!allowedStatuses.includes(itemStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid item status",
      });
    }

    if (
      itemStatus === "CANCELLED" &&
      cancellationReason.length < 5
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Cancellation reason must be at least 5 characters",
      });
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
          const existingItem =
            await tx.orderItem.findUnique({
              where: {
                id: itemId,
              },

              include: {
                product: true,
                order: {
                  select: {
                    id: true,
                    userId: true,
                    orderNumber: true,
                  },
                },
              },
            });

          if (!existingItem) {
            throw new Error(
              "Order item not found"
            );
          }

          if (
            ["COMPLETED", "CANCELLED"].includes(
              existingItem.itemStatus
            )
          ) {
            throw new Error(
              "This item is locked"
            );
          }

          /*
           * Admin normal forward flow:
           *
           * PENDING -> CONFIRMED
           * CONFIRMED -> PROCESSING
           * PROCESSING -> SHIPPED
           * SHIPPED -> DELIVERED
           * RESHIPPED -> DELIVERED
           * DELIVERED -> COMPLETED
           */
          const nextStatusMap = {
            PENDING: "CONFIRMED",
            CONFIRMED: "PROCESSING",
            PROCESSING: "SHIPPED",
            SHIPPED: "DELIVERED",
            RESHIPPED: "DELIVERED",
            DELIVERED: "COMPLETED",
          };

          if (
            itemStatus !== "CANCELLED"
          ) {
            const allowedNextStatus =
              nextStatusMap[
                existingItem.itemStatus
              ];

            if (!allowedNextStatus) {
              throw new Error(
                `Item status ${existingItem.itemStatus} is locked`
              );
            }

            if (
              itemStatus !==
              allowedNextStatus
            ) {
              throw new Error(
                `Admin can only update ${existingItem.itemStatus} to ${allowedNextStatus}`
              );
            }
          }

          /*
           * Update data আলাদা করে তৈরি করা হচ্ছে।
           * এতে shippedAt safely preserve হবে।
           */
          /*
 * ==========================================
 * STOCK MANAGEMENT
 * ==========================================
 *
 * PENDING -> CONFIRMED
 * stock একবারই কমবে।
 *
 * CANCELLED
 * আগে stock কমানো হয়ে থাকলে একবারই ফেরত যাবে।
 */

// CONFIRM => STOCK DECREASE
if (
  itemStatus === "CONFIRMED" &&
  !existingItem.stockReduced
) {
  const variant = await tx.productVariant.findFirst({
    where: {
      productId: existingItem.productId,
      size: existingItem.size || null,
      color: existingItem.color || null,
    },
  });

  if (variant) {
    if (variant.stock < existingItem.quantity) {
      throw new Error(
        `${existingItem.product.name} variant stock not available`
      );
    }

    if (existingItem.product.stock < existingItem.quantity) {
      throw new Error(
        `${existingItem.product.name} stock not available`
      );
    }

    await tx.productVariant.update({
      where: {
        id: variant.id,
      },
      data: {
        stock: {
          decrement: existingItem.quantity,
        },
      },
    });

    await tx.product.update({
      where: {
        id: existingItem.productId,
      },
      data: {
        stock: {
          decrement: existingItem.quantity,
        },
      },
    });
  } else {
    if (existingItem.product.stock < existingItem.quantity) {
      throw new Error(
        `${existingItem.product.name} stock not available`
      );
    }

    await tx.product.update({
      where: {
        id: existingItem.productId,
      },
      data: {
        stock: {
          decrement: existingItem.quantity,
        },
      },
    });
  }

  await tx.orderTimeline.create({
    data: {
      orderId: existingItem.orderId,
      itemId: existingItem.id,
      userId: req.user.id,
      title: "Stock deducted",
      details: `${existingItem.quantity} quantity deducted for ${existingItem.product.name}`,
      type: "STOCK",
    },
  });
}


// CANCEL => STOCK RETURN
if (
  itemStatus === "CANCELLED" &&
  existingItem.stockReduced
) {
  const variant = await tx.productVariant.findFirst({
    where: {
      productId: existingItem.productId,
      size: existingItem.size || null,
      color: existingItem.color || null,
    },
  });

  if (variant) {
    await tx.productVariant.update({
      where: {
        id: variant.id,
      },
      data: {
        stock: {
          increment: existingItem.quantity,
        },
      },
    });

    await tx.product.update({
      where: {
        id: existingItem.productId,
      },
      data: {
        stock: {
          increment: existingItem.quantity,
        },
      },
    });
  } else {
    await tx.product.update({
      where: {
        id: existingItem.productId,
      },
      data: {
        stock: {
          increment: existingItem.quantity,
        },
      },
    });
  }

  await tx.orderTimeline.create({
    data: {
      orderId: existingItem.orderId,
      itemId: existingItem.id,
      userId: req.user.id,
      title: "Stock returned",
      details: `${existingItem.quantity} quantity returned for ${existingItem.product.name}`,
      type: "STOCK",
    },
  });
}
       const updateData = {
  itemStatus,

  stockReduced:
    itemStatus === "CONFIRMED"
      ? true
      : itemStatus === "CANCELLED"
        ? false
        : existingItem.stockReduced,
};

          /*
           * প্রথমবার SHIPPED হলে shipment date save।
           *
           * আগে shippedAt থাকলে overwrite হবে না।
           */
          if (
            itemStatus === "SHIPPED"
          ) {
            updateData.shippedAt =
              existingItem.shippedAt ||
              new Date();
          }

          /*
           * DELIVERED status।
           */
          if (
            itemStatus === "DELIVERED"
          ) {
            updateData.deliveredAt =
              new Date();

            updateData.completedAt =
              null;

            /*
             * Replacement item delivery হলে
             * return RESOLVED হবে।
             */
            if (
              existingItem.returnStatus ===
              "RESHIPPED"
            ) {
              updateData.returnStatus =
                "RESOLVED";

              updateData.returnResolvedAt =
                new Date();
            }
          }

          /*
           * COMPLETED status।
           */
/*
 * COMPLETED status।
 */
/*
 * COMPLETED status।
 */
if (
  itemStatus === "COMPLETED"
) {
  updateData.completedAt =
    new Date();


  /*
   * Create vendor earning transaction
   * and update vendor balance only once
   */
  const existingFinance =
    await tx.financeTransaction.findFirst({
      where: {
        referenceId: existingItem.id,
        type: "VENDOR_EARNING",
      },
    });


  if (!existingFinance) {

    const earningAmount =
      Number(
        existingItem.vendorEarning || 0
      );


    // Finance history
    await tx.financeTransaction.create({
      data: {
        type: "VENDOR_EARNING",

        amount:
          earningAmount,

        vendorId:
          existingItem.vendorId,

        referenceId:
          existingItem.id,

        description:
          `Vendor earning generated for completed order item ${existingItem.id}`,
      },
    });


    // Add money to vendor wallet
    await tx.vendor.update({
      where: {
        id: existingItem.vendorId,
      },

      data: {
        availableBalance: {
          increment:
            earningAmount,
        },
      },
    });

  }
}

          /*
           * CANCELLED হলে shippedAt update করছি না।
           *
           * Pre-shipment cancellation:
           * shippedAt = null
           * delivery charge বাদ যাবে।
           *
           * Post-shipment cancellation:
           * shippedAt = পুরোনো date
           * delivery charge থাকবে।
           */
          const updatedItem =
            await tx.orderItem.update({
              where: {
                id: itemId,
              },

              data: updateData,

              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    images: true,
                  },
                },
              },
            });

          await tx.orderTimeline.create({
            data: {
              orderId:
                existingItem.orderId,

              itemId:
                existingItem.id,

              userId:
                req.user.id,

              title:
                itemStatus ===
                "CANCELLED"
                  ? "Item Cancelled by Admin"
                  : `Item ${itemStatus}`,

              details:
                itemStatus ===
                "CANCELLED"
                  ? `${existingItem.product.name} changed from ${existingItem.itemStatus} to CANCELLED. Reason: ${cancellationReason}`
                  : `${existingItem.product.name} changed from ${existingItem.itemStatus} to ${itemStatus}`,

              type:
                itemStatus ===
                "CANCELLED"
                  ? "CANCELLED"
                  : "STATUS",
            },
          });

          /*
           * Main order status এবং financial totals
           * একই transaction-এর মধ্যে update হবে।
           */
          const updatedOrder =
            await syncMainOrderStatusFromItems(
              existingItem.orderId,
              tx
            );

          return {
            updatedItem,
            updatedOrder,

            oldStatus:
              existingItem.itemStatus,

            oldShippedAt:
              existingItem.shippedAt,

            oldDeliveryCharge:
              existingItem.deliveryCharge,

            customerOrder:
              existingItem.order,
          };
        },
        {
          maxWait: 10000,
          timeout: 20000,
        }
      );

    await createActivityLog({
      userId: req.user.id,

      action:
        "ADMIN_ORDER_ITEM_STATUS_UPDATED",

      entityType:
        "ORDER_ITEM",

      entityId:
        result.updatedItem.id,

      oldData: {
        itemStatus:
          result.oldStatus,

        shippedAt:
          result.oldShippedAt,

        deliveryCharge:
          result.oldDeliveryCharge,
      },

      newData: {
        itemStatus:
          result.updatedItem.itemStatus,

        shippedAt:
          result.updatedItem.shippedAt,

        orderStatus:
          result.updatedOrder
            ?.orderStatus,

        deliveryFee:
          result.updatedOrder
            ?.deliveryFee,

        totalAmount:
          result.updatedOrder
            ?.totalAmount,

        ...(itemStatus ===
        "CANCELLED"
          ? {
              cancellationReason,
            }
          : {}),
      },

      req,
    });

    if (
      result.oldStatus !== result.updatedItem.itemStatus
    ) {
      const statusLabel = result.updatedItem.itemStatus
        .toLowerCase()
        .replaceAll("_", " ");

      await createCustomerNotificationSafely({
        userId: result.customerOrder.userId,
        title: "Order item " + statusLabel,
        message:
          result.updatedItem.product.name +
          " in order " +
          result.customerOrder.orderNumber +
          " is now " +
          statusLabel +
          ".",
        type: "ORDER_ITEM_STATUS_UPDATED",
        link: "/dashboard/orders/" + result.customerOrder.id,
      });
    }

    return res.status(200).json({
      success: true,

      message:
        "Item and main order status updated",

      item:
        result.updatedItem,

      order:
        result.updatedOrder,
    });
  } catch (error) {
    console.error(
      "Admin order item status error:",
      error
    );

    return res.status(400).json({
      success: false,

      message:
        error.message ||
        "Failed to update item status",
    });
  }
};
export const requestOrderItemReturnByCustomer = async (
  req,
  res
) => {
  try {
    const { itemId } = req.params;

    const { reason } = req.body;

    const orderItem =
      await prisma.orderItem.findFirst({
        where: {
          id: itemId,

          order: {
            userId: req.user.id,
          },
        },

        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },

          order: {
            select: {
              id: true,
              orderNumber: true,
              userId: true,
            },
          },
        },
      });

    if (!orderItem) {
      return res.status(404).json({
        success: false,
        message:
          "Order item not found for this customer",
      });
    }

    if (
      orderItem.itemStatus !== "DELIVERED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only delivered items can be returned",
      });
    }

    if (
      !["NONE", "RESOLVED"].includes(
        orderItem.returnStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A return request already exists for this item",
      });
    }

    if (!orderItem.deliveredAt) {
      return res.status(400).json({
        success: false,
        message:
          "Delivered time was not found for this item",
      });
    }

    const returnWindowMilliseconds =
      3 * 24 * 60 * 60 * 1000;

    const returnDeadline =
      new Date(
        orderItem.deliveredAt
      ).getTime() +
      returnWindowMilliseconds;

    if (Date.now() > returnDeadline) {
      return res.status(400).json({
        success: false,
        message:
          "The 3-day return window has expired",
      });
    }

    const updatedItem =
      await prisma.$transaction(
        async (tx) => {
          const item =
            await tx.orderItem.update({
              where: {
                id: itemId,
              },

              data: {
                returnStatus:
                  "REQUESTED",

                returnRequestedAt:
                  new Date(),
              },

              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    images: true,
                  },
                },
              },
            });

          await tx.orderTimeline.create({
            data: {
              orderId:
                orderItem.orderId,

              itemId:
                orderItem.id,

              userId:
                req.user.id,

              title:
                "Return Requested",

              details:
                reason?.trim()
                  ? `${
                      orderItem.product.name
                    } — ${reason.trim()}`
                  : `${orderItem.product.name} return requested by customer`,

              type: "RETURN",
            },
          });

          return item;
        }
      );

    await createActivityLog({
      userId: req.user.id,

      action:
        "CUSTOMER_RETURN_REQUESTED",

      entityType: "ORDER_ITEM",

      entityId: updatedItem.id,

      oldData: {
        returnStatus:
          orderItem.returnStatus,
      },

      newData: {
        returnStatus:
          updatedItem.returnStatus,

        returnRequestedAt:
          updatedItem.returnRequestedAt,
      },

      req,
    });

    return res.status(200).json({
      success: true,

      message:
        "Return request submitted successfully",

      item: updatedItem,
    });
  } catch (error) {
    console.error(
      "Customer return request error:",
      error
    );

    return res.status(400).json({
      success: false,

      message:
        error.message ||
        "Failed to submit return request",
    });
  }
};
export const updateOrderItemReturnByVendor = async (req, res) => {
  try {
    const { itemId } = req.params;

    const returnStatus = String(
      req.body.returnStatus || req.body.status || ""
    ).toUpperCase();

    const allowedStatuses = [
      "APPROVED",
      "REJECTED",
      "IN_TRANSIT",
      "RECEIVED",
      "RESHIPPED",
    ];

    if (!returnStatus) {
      return res.status(400).json({
        success: false,
        message: "Return status is required",
      });
    }

    if (!allowedStatuses.includes(returnStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid return status",
      });
    }

    const vendor = await prisma.vendor.findUnique({
      where: {
        userId: req.user.id,
      },
      select: {
        id: true,
      },
    });

    if (!vendor) {
      return res.status(403).json({
        success: false,
        message: "Vendor account not found",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingItem = await tx.orderItem.findFirst({
        where: {
          id: itemId,
          vendorId: vendor.id,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!existingItem) {
        throw new Error(
          "Order item not found or this item does not belong to you"
        );
      }

      const nextReturnStatusMap = {
        REQUESTED: ["APPROVED", "REJECTED"],
        APPROVED: ["IN_TRANSIT"],
        IN_TRANSIT: ["RECEIVED"],
        RECEIVED: ["RESHIPPED"],
      };

      const allowedNextStatuses =
        nextReturnStatusMap[existingItem.returnStatus] || [];

      if (!allowedNextStatuses.includes(returnStatus)) {
        throw new Error(
          `Return status cannot be changed from ${existingItem.returnStatus} to ${returnStatus}`
        );
      }

      const updateData = {
        returnStatus,
      };

      /*
       * Vendor replacement পাঠালে item আবার SHIPPED হবে।
       */
     if (returnStatus === "RESHIPPED") {
  updateData.itemStatus = "RESHIPPED";
  updateData.deliveredAt = null;
  updateData.completedAt = null;
  updateData.returnResolvedAt = null;
}

      const updatedItem = await tx.orderItem.update({
        where: {
          id: itemId,
        },
        data: updateData,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              images: true,
            },
          },
        },
      });

      await tx.orderTimeline.create({
        data: {
          orderId: existingItem.orderId,
          itemId: existingItem.id,
          userId: req.user.id,
          title: `Return ${returnStatus}`,
          details: `${existingItem.product.name} return status changed from ${existingItem.returnStatus} to ${returnStatus}`,
          type: "RETURN",
        },
      });

      const updatedOrder = await syncMainOrderStatusFromItems(
        existingItem.orderId,
        tx
      );

      return {
        updatedItem,
        updatedOrder,
        oldReturnStatus: existingItem.returnStatus,
      };
    });

    await createActivityLog({
      userId: req.user.id,
      action: "VENDOR_RETURN_STATUS_UPDATED",
      entityType: "ORDER_ITEM",
      entityId: result.updatedItem.id,
      oldData: {
        returnStatus: result.oldReturnStatus,
      },
      newData: {
        returnStatus: result.updatedItem.returnStatus,
        itemStatus: result.updatedItem.itemStatus,
      },
      req,
    });

    return res.status(200).json({
      success: true,
      message: `Return request ${returnStatus.toLowerCase()} successfully`,
      item: result.updatedItem,
      order: result.updatedOrder,
    });
  } catch (error) {
    console.error("Vendor return update error:", error);

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to update return status",
    });
  }
};
export const updateOrderItemReturnByAdmin = async (
  req,
  res
) => {
  try {
    const { itemId } = req.params;

    const returnStatus = String(
      req.body.returnStatus ||
        req.body.status ||
        ""
    ).toUpperCase();

    const allowedStatuses = [
      "APPROVED",
      "REJECTED",
    ];

    if (
      !allowedStatuses.includes(
        returnStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Admin can only approve or reject a requested return",
      });
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
          const existingItem =
            await tx.orderItem.findUnique({
              where: {
                id: itemId,
              },

              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            });

          if (!existingItem) {
            throw new Error(
              "Order item not found"
            );
          }

          if (
            existingItem.returnStatus !==
            "REQUESTED"
          ) {
            throw new Error(
              `Return cannot be changed from ${existingItem.returnStatus} to ${returnStatus}`
            );
          }

          const updatedItem =
            await tx.orderItem.update({
              where: {
                id: itemId,
              },

              data: {
                returnStatus,
              },

              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    images: true,
                  },
                },
              },
            });

          await tx.orderTimeline.create({
            data: {
              orderId:
                existingItem.orderId,

              itemId:
                existingItem.id,

              userId:
                req.user.id,

              title: `Return ${returnStatus}`,

              details: `${existingItem.product.name} return request ${returnStatus.toLowerCase()} by admin`,

              type: "RETURN",
            },
          });

          return {
            updatedItem,
            oldReturnStatus:
              existingItem.returnStatus,
          };
        }
      );

    await createActivityLog({
      userId: req.user.id,
      action:
        "ADMIN_RETURN_STATUS_UPDATED",
      entityType: "ORDER_ITEM",
      entityId:
        result.updatedItem.id,

      oldData: {
        returnStatus:
          result.oldReturnStatus,
      },

      newData: {
        returnStatus:
          result.updatedItem
            .returnStatus,
      },

      req,
    });

    return res.status(200).json({
      success: true,
      message: `Return ${returnStatus.toLowerCase()} successfully`,
      item: result.updatedItem,
    });
  } catch (error) {
    console.error(
      "Admin return update error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to update return request",
    });
  }
};


