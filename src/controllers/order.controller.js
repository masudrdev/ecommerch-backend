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

      for (const item of cart.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

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
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
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

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getAllOrdersForAdmin = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
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
        title: "Order Updated",
        message: `Your order ${order.orderNumber} has been updated.`,
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

      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

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
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const orders = await prisma.order.findMany({
      where: {
        items: {
          some: {
            vendorId: vendor.id,
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        items: {
          where: {
            vendorId: vendor.id,
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      total: orders.length,
      orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};