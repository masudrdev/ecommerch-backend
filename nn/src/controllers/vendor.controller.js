import prisma from "../lib/prisma.js";
import { vendorRegisterSchema } from "../validations/vendor.validation.js";
import { createNotification } from "../services/notification.service.js";

export const registerVendor = async (req, res) => {
  try {
    const data = vendorRegisterSchema.parse(req.body);



    const existingVendor = await prisma.vendor.findUnique({
      where: { userId: req.user.id },
    });

    if (existingVendor) {
      return res.status(400).json({
        success: false,
        message: "Vendor profile already exists",
      });
    }

    const existingSlug = await prisma.vendor.findUnique({
      where: { shopSlug: data.shopSlug },
    });

    if (existingSlug) {
      return res.status(400).json({
        success: false,
        message: "Shop slug already exists",
      });
    }

    const vendor = await prisma.vendor.create({
      data: {
        userId: req.user.id,
        shopName: data.shopName,
        shopSlug: data.shopSlug,
        description: data.description,
        status: "PENDING",
      },
    });

    res.status(201).json({
      success: true,
      message: "Vendor profile created. Waiting for admin approval.",
      vendor,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMyVendorProfile = async (req, res) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { userId: req.user.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor profile not found",
      });
    }

    res.json({
      success: true,
      vendor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const approveVendor = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await prisma.vendor.update({
      where: { id },
      data: {
        status: "APPROVED",
      },
    });

    res.json({
      success: true,
      message: "Vendor approved successfully",
      vendor,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
export const updateVendorStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const vendor = await prisma.vendor.update({
    where: { id },
    data: { status },
  });
await createNotification({
  userId: vendor.userId,
  title: "Vendor Approved",
  message: "Your vendor account has been approved.",
  type: "VENDOR_APPROVED",
  link: "/vendor/dashboard",
});
  return res.json({
    success: true,
    vendor,
  });
};
export const getVendorDashboard = async (req, res) => {
  
  try {
        const period = req.query.period || "7d";
    const vendor = await prisma.vendor.findUnique({
      where: { userId: req.user.id },
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

      let totalDays = 7;

    switch (period) {
      case "today":
        totalDays = 1;
        break;
      case "30d":
        totalDays = 30;
        break;
      case "90d":
        totalDays = 90;
        break;
      default:
        totalDays = 7;
    }

    const chartStart = new Date();
    chartStart.setHours(0, 0, 0, 0);
    chartStart.setDate(chartStart.getDate() - (totalDays - 1));

    const [
      products,
      orderItems,
      reviews,
      latestReviews,
      latestOrders,
    ] = await Promise.all([
      prisma.product.findMany({
        where: { vendorId: vendor.id },
        select: {
          id: true,
          name: true,
          slug: true,
          stock: true,
          status: true,
          variants: {
            select: {
              id: true,
              stock: true,
              size: true,
              color: true,
            },
          },
        },
      }),

      prisma.orderItem.findMany({
        where: { vendorId: vendor.id },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              customerName: true,
              totalAmount: true,
              orderStatus: true,
              createdAt: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),

      prisma.review.findMany({
        where: { product: { vendorId: vendor.id } },
        select: {
          id: true,
          rating: true,
          vendorReply: true,
          createdAt: true,
        },
      }),

      prisma.review.findMany({
        where: { product: { vendorId: vendor.id } },
        include: {
          user: {
            select: { id: true, name: true, username: true },
          },
          product: {
            select: { id: true, name: true, slug: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),

      prisma.orderItem.findMany({
        where: { vendorId: vendor.id },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              customerName: true,
              totalAmount: true,
              orderStatus: true,
              createdAt: true,
            },
          },
          product: {
            select: { id: true, name: true, slug: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    const deliveredItems = orderItems.filter((item) =>
      ["DELIVERED", "COMPLETED"].includes(item.order?.orderStatus)
    );

    const getItemRevenue = (item) => Number(item.price || 0) * Number(item.quantity || 0);

    const totalRevenue = deliveredItems.reduce(
      (sum, item) => sum + getItemRevenue(item),
      0
    );

    const thisMonthRevenue = deliveredItems
      .filter((item) => new Date(item.createdAt) >= monthStart)
      .reduce((sum, item) => sum + getItemRevenue(item), 0);

    const todayRevenue = deliveredItems
      .filter((item) => new Date(item.createdAt) >= todayStart)
      .reduce((sum, item) => sum + getItemRevenue(item), 0);

    const salesChart = [];

    for (let i = totalDays - 1; i >= 0; i--) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - i);

      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const dayItems = deliveredItems.filter((item) => {
        const createdAt = new Date(item.createdAt);
        return createdAt >= start && createdAt < end;
      });

      salesChart.push({
        date:
  totalDays === 1
    ? "Today"
    : totalDays <= 7
    ? start.toLocaleDateString("en-US", { weekday: "short" })
    : start.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
      }),
        revenue: dayItems.reduce((sum, item) => sum + getItemRevenue(item), 0),
        orders: dayItems.length,
      });
    }

    const topSellingMap = {};

    deliveredItems.forEach((item) => {
      if (!topSellingMap[item.productId]) {
        topSellingMap[item.productId] = {
          product: item.product,
          sold: 0,
          revenue: 0,
        };
      }

      topSellingMap[item.productId].sold += item.quantity || 0;
      topSellingMap[item.productId].revenue += getItemRevenue(item);
    });

    const topSellingProducts = Object.values(topSellingMap)
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5);

    const lowStockProducts = products
      .filter((product) => {
        const variantStocks = product.variants || [];

        if (variantStocks.length > 0) {
          return variantStocks.some((variant) => Number(variant.stock || 0) <= 5);
        }

        return Number(product.stock || 0) <= 5;
      })
      .map((product) => {
        const variantStocks = product.variants || [];

        const lowestVariantStock =
          variantStocks.length > 0
            ? Math.min(...variantStocks.map((variant) => Number(variant.stock || 0)))
            : null;

        return {
          id: product.id,
          name: product.name,
          slug: product.slug,
          stock:
            lowestVariantStock !== null
              ? lowestVariantStock
              : Number(product.stock || 0),
        };
      })
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 5);

    const totalReviewCount = reviews.length;
    const ratingSum = reviews.reduce((sum, item) => sum + item.rating, 0);

    const dashboard = {
      totalProducts: products.length,
      totalOrders: orderItems.length,
      pendingOrders: orderItems.filter((item) => item.itemStatus === "PENDING").length,
      completedOrders: deliveredItems.length,
      totalSales: totalRevenue,

      productStats: {
        total: products.length,
        approved: products.filter((item) => item.status === "APPROVED").length,
        pending: products.filter((item) => item.status === "PENDING").length,
        outOfStock: lowStockProducts.filter((item) => item.stock <= 0).length,
      },

      orderStats: {
        total: orderItems.length,
        pending: orderItems.filter((item) => item.itemStatus === "PENDING").length,
        processing: orderItems.filter((item) => item.itemStatus === "PROCESSING").length,
        shipped: orderItems.filter((item) => item.itemStatus === "SHIPPED").length,
        delivered: deliveredItems.length,
        cancelled: orderItems.filter((item) => item.itemStatus === "CANCELLED").length,
      },

      salesStats: {
        totalRevenue,
        thisMonthRevenue,
        todayRevenue,
        availableBalance: vendor.availableBalance || 0,
      },

      reviewStats: {
        total: totalReviewCount,
        average: totalReviewCount
          ? Number((ratingSum / totalReviewCount).toFixed(1))
          : 0,
        pendingReply: reviews.filter((item) => !item.vendorReply).length,
      },

      salesChart,
      latestOrders,
      latestReviews,
      lowStockProducts,
      topSellingProducts,
    };

    return res.json({
      success: true,
      dashboard,
    });
  } catch (error) {
    console.error("Vendor dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getVendorSalesChart = async (req, res) => {
  try {
    const period = req.query.period || "7d";

    const vendor = await prisma.vendor.findUnique({
      where: { userId: req.user.id },
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    let totalDays = 7;

    switch (period) {
      case "today":
        totalDays = 1;
        break;
      case "30d":
        totalDays = 30;
        break;
      case "90d":
        totalDays = 90;
        break;
      default:
        totalDays = 7;
    }

    const chartStart = new Date();
    chartStart.setHours(0, 0, 0, 0);
    chartStart.setDate(chartStart.getDate() - (totalDays - 1));

    const items = await prisma.orderItem.findMany({
      where: {
        vendorId: vendor.id,
        createdAt: { gte: chartStart },
        order: {
          orderStatus: {
            in: ["DELIVERED", "COMPLETED"],
          },
        },
      },
      select: {
        price: true,
        quantity: true,
        createdAt: true,
      },
    });

    const salesChart = [];

    for (let i = totalDays - 1; i >= 0; i--) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - i);

      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const dayItems = items.filter((item) => {
        const createdAt = new Date(item.createdAt);
        return createdAt >= start && createdAt < end;
      });

      salesChart.push({
        date:
          totalDays === 1
            ? "Today"
            : totalDays <= 7
            ? start.toLocaleDateString("en-US", { weekday: "short" })
            : start.toLocaleDateString("en-US", {
                day: "2-digit",
                month: "short",
              }),
        revenue: dayItems.reduce(
          (sum, item) =>
            sum + Number(item.price || 0) * Number(item.quantity || 0),
          0
        ),
        orders: dayItems.length,
      });
    }

    return res.json({
      success: true,
      salesChart,
    });
  } catch (error) {
    console.error("Vendor sales chart error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getAllVendors = async (req, res) => {
  try {
    const { status = "ALL", search = "" } = req.query;

    const where = {
      ...(status !== "ALL" ? { status } : {}),
      ...(search
        ? {
            OR: [
              { shopName: { contains: search, mode: "insensitive" } },
              { shopSlug: { contains: search, mode: "insensitive" } },
              {
                user: {
                  OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                    { phone: { contains: search, mode: "insensitive" } },
                  ],
                },
              },
            ],
          }
        : {}),
    };

    const vendors = await prisma.vendor.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
          },
        },
        _count: {
          select: {
            products: true,
            orders: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      vendors,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};