import prisma from "../lib/prisma.js";

export const getAdminDashboard = async (req, res) => {
  try {
    const [
      totalOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,

      totalProducts,
      pendingProducts,
      approvedProducts,
      rejectedProducts,

      totalVendors,
      pendingVendors,
      approvedVendors,

      totalCustomers,

      latestOrders,
      pendingVendorApproval,
      pendingProductApproval,
      lowStockProducts,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { orderStatus: "PENDING" } }),
      prisma.order.count({
        where: { orderStatus: { in: ["COMPLETED", "DELIVERED"] } },
      }),
      prisma.order.count({ where: { orderStatus: "CANCELLED" } }),

      prisma.product.count(),
      prisma.product.count({ where: { status: "PENDING" } }),
      prisma.product.count({ where: { status: "APPROVED" } }),
      prisma.product.count({ where: { status: "REJECTED" } }),

      prisma.vendor.count(),
      prisma.vendor.count({ where: { status: "PENDING" } }),
      prisma.vendor.count({ where: { status: "APPROVED" } }),

      prisma.user.count({ where: { role: "CUSTOMER" } }),

      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          phone: true,
          totalAmount: true,
          orderStatus: true,
          createdAt: true,
        },
      }),

      prisma.vendor.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          shopName: true,
          shopSlug: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      }),

      prisma.product.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          price: true,
          stock: true,
          status: true,
          createdAt: true,
          vendor: {
            select: {
              shopName: true,
            },
          },
        },
      }),

      prisma.product.findMany({
        where: {
          OR: [
            { stock: { lte: 5 } },
            {
              variants: {
                some: {
                  stock: { lte: 5 },
                },
              },
            },
          ],
        },
        orderBy: { stock: "asc" },
        take: 8,
        select: {
          id: true,
          name: true,
          stock: true,
          status: true,
          vendor: {
            select: {
              shopName: true,
            },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      dashboard: {
        totalOrders,
        pendingOrders,
        completedOrders,
        cancelledOrders,

        totalProducts,
        pendingProducts,
        approvedProducts,
        rejectedProducts,

        totalVendors,
        pendingVendors,
        approvedVendors,

        totalCustomers,

        latestOrders,
        pendingVendorApproval,
        pendingProductApproval,
        lowStockProducts,
      },
    });
  } catch (error) {
    console.error("Admin Dashboard Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};