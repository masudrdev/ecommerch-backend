import prisma from "../lib/prisma.js";

export const getCustomerDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    const totalOrders = await prisma.order.count({
      where: { userId },
    });

    const pendingOrders = await prisma.order.count({
      where: { userId, orderStatus: "PENDING" },
    });

    const deliveredOrders = await prisma.order.count({
      where: {
        userId,
        orderStatus: { in: ["DELIVERED", "COMPLETED"] },
      },
    });

    const wishlistItems = await prisma.wishlist.count({
      where: { userId },
    });

    const reviewsGiven = await prisma.review.count({
      where: { userId },
    });

    res.json({
      success: true,
      dashboard: {
        totalOrders,
        pendingOrders,
        deliveredOrders,
        wishlistItems,
        reviewsGiven,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getSupportDashboard = async (req, res) => {
  try {
    const openTickets = await prisma.supportTicket.count({
      where: { status: "OPEN" },
    });

    const pendingTickets = await prisma.supportTicket.count({
      where: { status: "PENDING" },
    });

    const resolvedTickets = await prisma.supportTicket.count({
      where: { status: "RESOLVED" },
    });

    const closedTickets = await prisma.supportTicket.count({
      where: { status: "CLOSED" },
    });

    res.json({
      success: true,
      dashboard: {
        openTickets,
        pendingTickets,
        resolvedTickets,
        closedTickets,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};