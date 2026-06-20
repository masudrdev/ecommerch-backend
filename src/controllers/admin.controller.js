import prisma from "../lib/prisma.js";

export const getAdminDashboard = async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalCustomers = await prisma.user.count({
      where: { role: "CUSTOMER" },
    });

    const totalVendors = await prisma.vendor.count();
    const pendingVendors = await prisma.vendor.count({
      where: { status: "PENDING" },
    });

    const totalProducts = await prisma.product.count();
    const pendingProducts = await prisma.product.count({
      where: { status: "PENDING" },
    });

    const totalOrders = await prisma.order.count();
    const pendingOrders = await prisma.order.count({
      where: { orderStatus: "PENDING" },
    });

    const completedOrders = await prisma.order.count({
      where: { orderStatus: "COMPLETED" },
    });

    const revenue = await prisma.order.aggregate({
      where: {
        orderStatus: {
          in: ["DELIVERED", "COMPLETED"],
        },
      },
      _sum: {
        totalAmount: true,
      },
    });

    res.json({
      success: true,
      dashboard: {
        totalUsers,
        totalCustomers,
        totalVendors,
        pendingVendors,
        totalProducts,
        pendingProducts,
        totalOrders,
        pendingOrders,
        completedOrders,
        totalRevenue: revenue._sum.totalAmount || 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};