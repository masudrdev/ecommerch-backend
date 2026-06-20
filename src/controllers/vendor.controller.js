import prisma from "../lib/prisma.js";
import { vendorRegisterSchema } from "../validations/vendor.validation.js";

export const registerVendor = async (req, res) => {
  try {
    const data = vendorRegisterSchema.parse(req.body);

    if (req.user.role !== "VENDOR") {
      return res.status(403).json({
        success: false,
        message: "Only vendor users can register shop",
      });
    }

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

    const totalProducts = await prisma.product.count({
      where: {
        vendorId: vendor.id,
      },
    });

    const totalOrders = await prisma.orderItem.count({
      where: {
        vendorId: vendor.id,
      },
    });

    const pendingOrders = await prisma.orderItem.count({
      where: {
        vendorId: vendor.id,
        order: {
          orderStatus: "PENDING",
        },
      },
    });

    const completedOrders = await prisma.orderItem.count({
      where: {
        vendorId: vendor.id,
        order: {
          orderStatus: "COMPLETED",
        },
      },
    });

    const sales = await prisma.orderItem.aggregate({
      where: {
        vendorId: vendor.id,
        order: {
          orderStatus: {
            in: ["DELIVERED", "COMPLETED"],
          },
        },
      },
      _sum: {
        price: true,
      },
    });

    res.json({
      success: true,
      dashboard: {
        totalProducts,
        totalOrders,
        pendingOrders,
        completedOrders,
        totalSales: sales._sum.price || 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};