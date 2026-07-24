import prisma from "../lib/prisma.js";
import createActivityLog from "../utils/createActivityLog.js";
import createNotification from "../utils/createNotification.js";
const generateOrderNumber = () => {
  return "FB-" + Date.now();
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
      deliveryFee = 0,
    } = req.body;

    const orderUserId =
      req.user.role === "CUSTOMER" ? req.user.id : customerId;

    if (!orderUserId) {
      return res.status(400).json({
        success: false,
        message: "Customer ID is required",
      });
    }

    const customer = await prisma.user.findUnique({
      where: { id: orderUserId },
    });

    if (!customer || customer.role !== "CUSTOMER") {
      return res.status(400).json({
        success: false,
        message: "Valid customer not found",
      });
    }

    const cart = await prisma.cart.findUnique({
      where: { userId: orderUserId },
      include: {
        items: {
          include: {
            product: {
              include: { vendor: true },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    let totalAmount = 0;

    for (const item of cart.items) {
      if (item.product.status !== "APPROVED") {
        return res.status(400).json({
          success: false,
          message: `${item.product.name} is not available`,
        });
      }

      if (item.product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `${item.product.name} stock not available`,
        });
      }

      const price = item.product.salePrice || item.product.price;
      totalAmount += price * item.quantity;
    }

    const grandTotal = totalAmount + deliveryFee;

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId: orderUserId,
          createdById: req.user.id,
          createdByRole: req.user.role,
          source:
            req.user.role === "CUSTOMER"
              ? "CUSTOMER"
              : `${req.user.role}_MANUAL`,

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
            create: cart.items.map((item) => ({
              productId: item.productId,
              vendorId: item.product.vendorId,
              quantity: item.quantity,
              price: item.product.salePrice || item.product.price,
              size: item.size,
              color: item.color,
            })),
          },
        },
        include: {
          items: true,
        },
      });



      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return newOrder;
    });
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
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        source: order.source,
      },
      req,
    });
    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
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
      req.user.role === "SUPER_ADMIN";

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
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search?.trim() || "";
    const status = req.query.status?.trim() || "";
    const paymentStatus = req.query.paymentStatus?.trim() || "";
    const sort = req.query.sort === "oldest" ? "asc" : "desc";

    const where = {
      ...(status ? { orderStatus: status } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
      ...(search
        ? {
            OR: [
              { orderNumber: { contains: search, mode: "insensitive" } },
              { customerName: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              {
                user: {
                  name: { contains: search, mode: "insensitive" },
                },
              },
              {
                user: {
                  email: { contains: search, mode: "insensitive" },
                },
              },
            ],
          }
        : {}),
    };

    const [orders, totalOrders] = await Promise.all([
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
                    where: { isMain: true },
                    select: { url: true },
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

      prisma.order.count({ where }),
    ]);

    res.json({
      success: true,
      orders,
      pagination: {
        total: totalOrders,
        page,
        limit,
        totalPages: Math.ceil(totalOrders / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
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
    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
      },
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
      await createNotification({
        userId: order.userId,
        title: notificationTitle,
        message: notificationMessage,
        type: action,
        link: `/customer/orders/${order.id}`,
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

      const price = product.salePrice || product.price;

      totalAmount += price * item.quantity;

      orderItems.push({
        productId: product.id,
        vendorId: product.vendorId,
        quantity: item.quantity,
        price,
        size: item.size,
        color: item.color,
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
      where: { userId: req.user.id },
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search?.trim() || "";
    const status = req.query.status?.trim() || "ALL";

    const itemWhere = {
      vendorId: vendor.id,

      ...(status !== "ALL"
        ? {
          itemStatus: status,
        }
        : {}),

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

    const allVendorItems = await prisma.orderItem.findMany({
      where: itemWhere,
      orderBy: {
        order: {
          createdAt: "desc",
        },
      },
      select: {
        id: true,
        itemStatus: true,
        quantity: true,
        price: true,
        size: true,
        color: true,

        order: {
          select: {
            id: true,
            orderNumber: true,
            createdAt: true,
          },
        },

        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: {
              where: { isMain: true },
              select: { url: true },
              take: 1,
            },
          },
        },
      },
    });

    const groupedMap = new Map();

    for (const item of allVendorItems) {
      const orderId = item.order.id;

      if (!groupedMap.has(orderId)) {
        groupedMap.set(orderId, {
          orderId,
          orderNumber: item.order.orderNumber,
          createdAt: item.order.createdAt,
          items: [],
          vendorTotal: 0,
        });
      }

      const orderGroup = groupedMap.get(orderId);

      orderGroup.items.push({
        id: item.id,
        itemStatus: item.itemStatus,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity,
        size: item.size,
        color: item.color,
        product: item.product,
      });

      orderGroup.vendorTotal += item.price * item.quantity;
    }

    const groupedOrders = Array.from(groupedMap.values());

    const getVendorStatus = (items) => {
      const statuses = items.map((item) =>
  item.itemStatus === "RESHIPPED"
    ? "SHIPPED"
    : item.itemStatus
);

      if (statuses.every((s) => s === "SHIPPED")) return "SHIPPED";
      if (statuses.includes("SHIPPED")) return "PARTIALLY_SHIPPED";

      if (statuses.every((s) => s === "PROCESSING")) return "PROCESSING";
      if (statuses.includes("PROCESSING")) return "PARTIALLY_PROCESSING";

      if (statuses.every((s) => s === "CONFIRMED")) return "CONFIRMED";
      if (statuses.includes("CONFIRMED")) return "PARTIALLY_CONFIRMED";

      return "PENDING";
    };

    const formattedOrders = groupedOrders.map((order) => ({
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      vendorStatus: getVendorStatus(order.items),
      itemCount: order.items.length,
      vendorTotal: order.vendorTotal,
      image: order.items[0]?.product?.images?.[0]?.url || null,
      products: order.items.map((item) => ({
        itemId: item.id,
        productId: item.product?.id,
        name: item.product?.name,
        image: item.product?.images?.[0]?.url || null,
        quantity: item.quantity,
        itemStatus: item.itemStatus,
      })),
      items: order.items,
    }));

    const totalOrders = formattedOrders.length;
    const paginatedOrders = formattedOrders.slice(skip, skip + limit);

    return res.json({
      success: true,
      totalOrders,
      totalItems: allVendorItems.length,
      currentPage: page,
      limit,
      totalPages: Math.ceil(totalOrders / limit),
      orders: paginatedOrders,
    });
  } catch (error) {
    console.error("Get vendor orders error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
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
        itemStatus: true,
      },
    });

  if (!items.length) {
    return null;
  }

  /*
   * Item-এর actual status RESHIPPED থাকবে।
   * Main order calculation-এ এটাকে SHIPPED ধরা হবে।
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

  return prismaClient.order.update({
    where: {
      id: orderId,
    },
    data: {
      orderStatus: newOrderStatus,
    },
  });
};

export const updateVendorOrderItemStatus = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { itemStatus } = req.body;

    const vendor = await prisma.vendor.findUnique({
      where: { userId: req.user.id },
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const updatedItem = await prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.findFirst({
        where: {
          id: itemId,
          vendorId: vendor.id,
        },
        include: {
          product: true,
        },
      });

      if (!item) {
        throw new Error("Order item not found");
      }

      const forwardNextStatusMap = {
        PENDING: "CONFIRMED",
        CONFIRMED: "PROCESSING",
        PROCESSING: "SHIPPED",
      };

      const canCancelFrom = ["CONFIRMED", "PROCESSING", "SHIPPED"];

      if (itemStatus === "CANCELLED") {
        if (!canCancelFrom.includes(item.itemStatus)) {
          throw new Error(`You cannot cancel item from ${item.itemStatus}`);
        }
      } else {
        const nextStatus = forwardNextStatusMap[item.itemStatus];

        if (!nextStatus) {
          throw new Error("Item status is locked");
        }

        if (itemStatus !== nextStatus) {
          throw new Error(`You can only update ${item.itemStatus} to ${nextStatus}`);
        }
      }

      // Stock decrease: PENDING -> CONFIRMED
      if (itemStatus === "CONFIRMED" && !item.stockReduced) {
        const variant = await tx.productVariant.findFirst({
          where: {
            productId: item.productId,
            size: item.size || null,
            color: item.color || null,
          },
        });

        if (variant) {
          if (variant.stock < item.quantity) {
            throw new Error(`${item.product.name} variant stock not available`);
          }

          await tx.productVariant.update({
            where: { id: variant.id },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });


          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
        }

        else {
          if (item.product.stock < item.quantity) {
            throw new Error(`${item.product.name} stock not available`);
          }

          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
        }

      }
      if (itemStatus === "CONFIRMED" && !item.stockReduced) {
  await tx.orderTimeline.create({
    data: {
      orderId: item.orderId,
      itemId: item.id,
      userId: req.user.id,
      title: "Stock deducted",
      details: `${item.quantity} quantity deducted for ${item.product.name}`,
      type: "STOCK",
    },
  });
}

      // Stock return: CONFIRMED / PROCESSING / SHIPPED -> CANCELLED
      if (itemStatus === "CANCELLED" && item.stockReduced) {
        const variant = await tx.productVariant.findFirst({
          where: {
            productId: item.productId,
            size: item.size || null,
            color: item.color || null,
          },
        });

        if (variant) {
          await tx.productVariant.update({
            where: { id: variant.id },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });

          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });
        }
      }

      const itemAfterUpdate = await tx.orderItem.update({
        where: { id: item.id },
        data: {
          itemStatus,
          stockReduced:
            itemStatus === "CONFIRMED"
              ? true
              : itemStatus === "CANCELLED"
                ? false
                : item.stockReduced,
        },
      });
const timelineTitleMap = {
  CONFIRMED: "Item Confirmed",
  PROCESSING: "Processing Started",
  SHIPPED: "Item Shipped",
  CANCELLED: "Item Cancelled",
};

await tx.orderTimeline.create({
  data: {
    orderId: item.orderId,
    itemId: item.id,
    userId: req.user.id,
    title: timelineTitleMap[itemStatus] || "Item Status Updated",
    details: item.product.name,
    type: "STATUS",
  },
});

      return {
        oldItem: item,
        newItem: itemAfterUpdate,
      };
    });

    await syncMainOrderStatusFromItems(updatedItem.newItem.orderId);

    await createActivityLog({
      userId: req.user.id,
      action: "VENDOR_ORDER_ITEM_STATUS_UPDATED",
      entityType: "ORDER_ITEM",
      entityId: updatedItem.newItem.id,
      oldData: {
        itemStatus: updatedItem.oldItem.itemStatus,
        stockReduced: updatedItem.oldItem.stockReduced,
      },
      newData: {
        itemStatus: updatedItem.newItem.itemStatus,
        stockReduced: updatedItem.newItem.stockReduced,
      },
      req,
    });

    return res.json({
      success: true,
      message: "Order item status updated successfully",
      item: updatedItem.newItem,
    });
  } catch (error) {
    console.error("Vendor order item status update error:", error);
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

};
// const getVendorStatusFromItems = (items) => {
//   const statuses = items.map((item) =>
//   item.itemStatus === "RESHIPPED"
//     ? "SHIPPED"
//     : item.itemStatus
// );

//   if (statuses.every((s) => s === "SHIPPED")) return "SHIPPED";
//   if (statuses.includes("SHIPPED")) return "PARTIALLY_SHIPPED";

//   if (statuses.every((s) => s === "PROCESSING")) return "PROCESSING";
//   if (statuses.includes("PROCESSING")) return "PARTIALLY_PROCESSING";

//   if (statuses.every((s) => s === "CONFIRMED")) return "CONFIRMED";
//   if (statuses.includes("CONFIRMED")) return "PARTIALLY_CONFIRMED";

//   return "PENDING";
// };
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

    const items = order.items.map((item) => ({
      ...item,
      subtotal: item.price * item.quantity,
    }));

    const vendorTotal = items.reduce((sum, item) => sum + item.subtotal, 0);

    return res.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        vendorStatus: getVendorStatusFromItems(items),
        vendorTotal,
        items,
        notes: order.notes || [],
        timeline: order.timelines || [],
      },
    });
  } catch (error) {
    console.error("Get vendor order details error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
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
export const updateOrderItemStatusByAdmin = async (req, res) => {
  try {
    const { itemId } = req.params;

    const itemStatus = String(
      req.body.itemStatus || req.body.status || ""
    ).toUpperCase();

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

    const result = await prisma.$transaction(async (tx) => {
      const existingItem = await tx.orderItem.findUnique({
        where: { id: itemId },
        include: {
          product: true,
        },
      });

      if (!existingItem) {
        throw new Error("Order item not found");
      }

      if (
        ["COMPLETED", "CANCELLED"].includes(
          existingItem.itemStatus
        )
      ) {
        throw new Error("This item is locked");
      }

const nextStatusMap = {
  PENDING: "CONFIRMED",
  CONFIRMED: "PROCESSING",
  PROCESSING: "SHIPPED",
  SHIPPED: "DELIVERED",
  RESHIPPED: "DELIVERED",
  DELIVERED: "COMPLETED",
};

      if (itemStatus !== "CANCELLED") {
        const allowedNextStatus =
          nextStatusMap[existingItem.itemStatus];

        if (itemStatus !== allowedNextStatus) {
          throw new Error(
            `Admin can only update ${existingItem.itemStatus} to ${allowedNextStatus}`
          );
        }
      }

 const updatedItem = await tx.orderItem.update({
  where: {
    id: itemId,
  },

data: {
  itemStatus,

  ...(itemStatus === "DELIVERED"
    ? {
        deliveredAt: new Date(),
        completedAt: null,

        returnStatus:
          existingItem.returnStatus ===
          "RESHIPPED"
            ? "RESOLVED"
            : existingItem.returnStatus,

        returnResolvedAt:
          existingItem.returnStatus ===
          "RESHIPPED"
            ? new Date()
            : existingItem.returnResolvedAt,
      }
    : {}),

  ...(itemStatus === "COMPLETED"
    ? {
        completedAt: new Date(),
      }
    : {}),
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
          orderId: existingItem.orderId,
          itemId: existingItem.id,
          userId: req.user.id,
          title: `Item ${itemStatus}`,
          details: `${existingItem.product.name} changed from ${existingItem.itemStatus} to ${itemStatus}`,
          type: "STATUS",
        },
      });

      const updatedOrder =
        await syncMainOrderStatusFromItems(
          existingItem.orderId,
          tx
        );

      return {
        updatedItem,
        updatedOrder,
        oldStatus: existingItem.itemStatus,
      };
    });

    await createActivityLog({
      userId: req.user.id,
      action: "ADMIN_ORDER_ITEM_STATUS_UPDATED",
      entityType: "ORDER_ITEM",
      entityId: result.updatedItem.id,
      oldData: {
        itemStatus: result.oldStatus,
      },
      newData: {
        itemStatus: result.updatedItem.itemStatus,
        orderStatus: result.updatedOrder.orderStatus,
      },
      req,
    });

    return res.json({
      success: true,
      message: "Item and main order status updated",
      item: result.updatedItem,
      order: result.updatedOrder,
    });
  } catch (error) {
    console.error(
      "Admin order item status error:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
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
