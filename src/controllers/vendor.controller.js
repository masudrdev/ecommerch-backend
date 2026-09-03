import prisma from "../lib/prisma.js";
import { vendorRegisterSchema } from "../validations/vendor.validation.js";
import { createNotification } from "../services/notification.service.js";
import uploadToCloudinary from "../utils/uploadToCloudinary.js";
import deleteFromCloudinary from "../utils/deleteFromCloudinary.js";
import sendVendorContactChangeEmail from "../utils/sendVendorContactChangeEmail.js";
import { scheduleVendorContactChangeCleanup } from "../services/vendorContactCleanup.service.js";
import { isPhoneUniqueError, normalizePhone } from "../utils/phone.js";
import {
  CONTACT_CODE_TTL_MS,
  CONTACT_CODE_RESEND_MS,
  CONTACT_CODE_MAX_ATTEMPTS,
  createContactChangeCode,
} from "../utils/contactChangeVerification.js";

export const registerVendor = async (req, res) => {
  let uploadedLogo = null;
  try {
    const data = vendorRegisterSchema.parse(req.body);
    const existingVendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
    if (existingVendor) return res.status(409).json({ success: false, message: "Vendor application already exists", vendor: existingVendor });
    const existingSlug = await prisma.vendor.findUnique({ where: { shopSlug: data.shopSlug } });
    if (existingSlug) return res.status(409).json({ success: false, message: "Shop slug already exists" });
    if (req.file && !isRealImage(req.file)) return res.status(400).json({ success: false, message: "Please upload a valid JPG, PNG, or WebP Vendor logo" });
    if (req.file) uploadedLogo = await uploadToCloudinary(req.file.buffer, "friendbazar/vendor-logos");

    const vendor = await prisma.vendor.create({
      data: {
        userId: req.user.id,
        shopName: data.shopName,
        shopSlug: data.shopSlug,
        description: data.description || null,
        officeDistrict: data.officeDistrict || null,
        officeUpazila: data.officeUpazila || null,
        officeVillage: data.officeVillage || null,
        shopLogo: uploadedLogo?.secure_url || null,
        status: "PENDING",
      },
    });
    return res.status(201).json({ success: true, message: "Vendor application submitted. Waiting for admin approval.", vendor });
  } catch (error) {
    if (uploadedLogo?.public_id) await deleteFromCloudinary(uploadedLogo.public_id).catch(() => null);
    return res.status(400).json({ success: false, message: error?.issues?.[0]?.message || error.message });
  }
};

export const getMyVendorApplication = async (req, res) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
    return res.json({ success: true, vendor });
  } catch {
    return res.status(500).json({ success: false, message: "Unable to load Vendor application" });
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
            phone: true,
            isEmailVerified: true,
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

const applyVendorStatus = async (vendorId, status) => prisma.$transaction(async (tx) => {
  const existing = await tx.vendor.findUnique({ where: { id: vendorId }, select: { id: true, userId: true } });
  if (!existing) throw new Error("Vendor not found");
  const vendor = await tx.vendor.update({ where: { id: vendorId }, data: { status } });
  await tx.user.update({
    where: { id: existing.userId },
    data: { role: status === "APPROVED" ? "VENDOR" : "CUSTOMER" },
  });
  return vendor;
});

export const approveVendor = async (req, res) => {
  try {
    const vendor = await applyVendorStatus(req.params.id, "APPROVED");
    await createNotification({ userId: vendor.userId, title: "Vendor Approved", message: "Your vendor account has been approved.", type: "VENDOR_APPROVED", link: "/dashboard" });
    return res.json({ success: true, message: "Vendor approved successfully", vendor });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const updateVendorStatus = async (req, res) => {
  try {
    const status = String(req.body?.status || "").toUpperCase();
    if (!["PENDING", "APPROVED", "REJECTED", "SUSPENDED"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid Vendor status" });
    }
    const vendor = await applyVendorStatus(req.params.id, status);
    if (status === "APPROVED") {
      await createNotification({ userId: vendor.userId, title: "Vendor Approved", message: "Your vendor account has been approved.", type: "VENDOR_APPROVED", link: "/dashboard" });
    }
    return res.json({ success: true, vendor, message: `Vendor status updated to ${status}` });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
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

    const completedRevenueItems = orderItems.filter(
      (item) => String(item.itemStatus || "").toUpperCase() === "COMPLETED"
    );

    const getVendorRevenue = (item) =>
      Number(
        item.vendorEarning ??
          getItemRevenue(item) -
            Number(item.platformEarning ?? item.commissionAmount ?? 0)
      );

    const getRevenueDate = (item) =>
      new Date(item.completedAt || item.createdAt);

    const totalRevenue = completedRevenueItems.reduce(
      (sum, item) => sum + getVendorRevenue(item),
      0
    );

    const thisMonthRevenue = completedRevenueItems
      .filter((item) => getRevenueDate(item) >= monthStart)
      .reduce((sum, item) => sum + getVendorRevenue(item), 0);

    const todayRevenue = completedRevenueItems
      .filter((item) => getRevenueDate(item) >= todayStart)
      .reduce((sum, item) => sum + getVendorRevenue(item), 0);
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
            username: true,
            email: true,
            phone: true,
            status: true,
            isEmailVerified: true,
            createdAt: true,
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

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isValidPhone = (value) => /^[+0-9][0-9\s-]{5,29}$/.test(value);
const isRealImage = (file) => {
  const bytes = file?.buffer;
  if (!bytes || bytes.length < 12) return false;
  if (file.mimetype === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.mimetype === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (file.mimetype === "image/webp") return bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
  return false;
};

const vendorProfileSelect = {
  id: true,
  shopName: true,
  shopSlug: true,
  shopLogo: true,
  officeAddress: true,
  officeDistrict: true,
  officeUpazila: true,
  officeVillage: true,
  status: true,
  user: { select: { id: true, name: true, username: true, email: true, phone: true, role: true, isEmailVerified: true } },
};

export const updateMyVendorProfile = async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const officeDistrict = String(req.body?.officeDistrict || "").trim();
    const officeUpazila = String(req.body?.officeUpazila || "").trim();
    const officeVillage = String(req.body?.officeVillage || "").trim();
    if (name.length < 2 || name.length > 100) return res.status(400).json({ success: false, message: "Valid name is required" });
    if ([officeDistrict, officeUpazila, officeVillage].some((value) => value.length > 120)) {
      return res.status(400).json({ success: false, message: "Office address field is too long" });
    }

    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor profile not found" });

    let shopLogo = vendor.shopLogo;
    if (req.file) {
      if (!isRealImage(req.file)) return res.status(400).json({ success: false, message: "Please upload a valid JPG, PNG, or WebP image" });
      const uploaded = await uploadToCloudinary(req.file.buffer, "friendbazar/vendor-logos");
      shopLogo = uploaded.secure_url;
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: req.user.id }, data: { name } });
      return tx.vendor.update({
        where: { userId: req.user.id },
        data: {
          officeDistrict: officeDistrict || null,
          officeUpazila: officeUpazila || null,
          officeVillage: officeVillage || null,
          shopLogo,
        },
        select: vendorProfileSelect,
      });
    });
    return res.json({ success: true, message: "Vendor profile updated successfully", vendor: updated });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.error("Vendor profile update failed:", error?.message);
    return res.status(500).json({ success: false, message: "Unable to update Vendor Profile" });
  }
};

export const requestVendorContactChange = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: { vendor: true } });
    if (!user?.vendor) return res.status(404).json({ success: false, message: "Vendor profile not found" });
    if (!user.isEmailVerified) return res.status(400).json({ success: false, message: "Your current email must be verified" });

    const requestedEmail = req.body?.email == null ? user.email : String(req.body.email).trim().toLowerCase();
    const requestedPhone = req.body?.phone == null ? user.phone : normalizePhone(req.body.phone);
    const pendingEmail = requestedEmail !== user.email ? requestedEmail : null;
    const pendingPhone = requestedPhone !== (user.phone || "") ? requestedPhone : null;
    if (!pendingEmail && !pendingPhone) return res.status(400).json({ success: false, message: "No email or phone change detected" });
    if (pendingEmail && !isValidEmail(pendingEmail)) return res.status(400).json({ success: false, message: "Valid email is required" });
    if (pendingPhone && !isValidPhone(pendingPhone)) return res.status(400).json({ success: false, message: "Valid phone number is required" });
    if (pendingEmail) {
      const existing = await prisma.user.findFirst({ where: { email: pendingEmail, NOT: { id: user.id } }, select: { id: true } });
      if (existing) return res.status(409).json({ success: false, message: "Email is already in use" });
    }
    if (pendingPhone) {
      const existing = await prisma.user.findUnique({ where: { phone: pendingPhone }, select: { id: true } });
      if (existing && existing.id !== user.id) return res.status(409).json({ success: false, message: "Phone number is already in use" });
    }
    if (user.vendor.contactChangeLastSentAt && Date.now() - user.vendor.contactChangeLastSentAt.getTime() < CONTACT_CODE_RESEND_MS) {
      return res.status(429).json({ success: false, message: "Please wait before requesting another code" });
    }

    const code = createContactChangeCode();
    const expiresAt = new Date(Date.now() + CONTACT_CODE_TTL_MS);
    await prisma.vendor.update({ where: { id: user.vendor.id }, data: {
      pendingEmail, pendingPhone, contactChangeCode: code,
      contactChangeExpiresAt: expiresAt, contactChangeAttempts: 0,
      contactChangeLastSentAt: new Date(),
    } });
    scheduleVendorContactChangeCleanup(user.vendor.id, expiresAt);
    try {
      await sendVendorContactChangeEmail({ email: user.email, code });
    } catch (error) {
      await prisma.vendor.update({ where: { id: user.vendor.id }, data: {
        pendingEmail: null, pendingPhone: null, contactChangeCode: null,
        contactChangeExpiresAt: null, contactChangeAttempts: 0,
        contactChangeLastSentAt: null,
      } });
      if (process.env.NODE_ENV !== "production") console.error("Vendor contact email delivery failed:", error?.message);
      return res.status(502).json({ success: false, message: "Unable to send verification code" });
    }
    return res.json({ success: true, message: "Verification code sent to your current verified email" });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.error("Vendor contact change request failed:", error?.message);
    return res.status(500).json({ success: false, message: "Unable to request contact change" });
  }
};

export const verifyVendorContactChange = async (req, res) => {
  try {
    const code = String(req.body?.code || "").trim();
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ success: false, message: "Invalid verification code" });
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id }, include: { user: true } });
    if (!vendor?.contactChangeCode || (!vendor.pendingEmail && !vendor.pendingPhone)) return res.status(400).json({ success: false, message: "No pending contact change" });
    if (!vendor.contactChangeExpiresAt || vendor.contactChangeExpiresAt <= new Date()) {
      await prisma.vendor.update({ where: { id: vendor.id }, data: {
        pendingEmail: null, pendingPhone: null, contactChangeCode: null,
        contactChangeExpiresAt: null, contactChangeAttempts: 0, contactChangeLastSentAt: null,
      } });
      return res.status(400).json({ success: false, message: "Verification code expired" });
    }
    if (vendor.contactChangeAttempts >= CONTACT_CODE_MAX_ATTEMPTS) return res.status(429).json({ success: false, message: "Too many verification attempts. Request a new code" });
    if (code !== vendor.contactChangeCode) {
      await prisma.vendor.update({ where: { id: vendor.id }, data: { contactChangeAttempts: { increment: 1 } } });
      return res.status(400).json({ success: false, message: "Invalid verification code" });
    }
    if (vendor.pendingEmail) {
      const existing = await prisma.user.findFirst({ where: { email: vendor.pendingEmail, NOT: { id: req.user.id } }, select: { id: true } });
      if (existing) return res.status(409).json({ success: false, message: "Email is already in use" });
    }
    if (vendor.pendingPhone) {
      const existing = await prisma.user.findUnique({ where: { phone: vendor.pendingPhone }, select: { id: true } });
      if (existing && existing.id !== req.user.id) return res.status(409).json({ success: false, message: "Phone number is already in use" });
    }
    const updated = await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: req.user.id }, data: {
        ...(vendor.pendingEmail ? { email: vendor.pendingEmail } : {}),
        ...(vendor.pendingPhone ? { phone: vendor.pendingPhone } : {}),
      } });
      return tx.vendor.update({ where: { id: vendor.id }, data: {
        pendingEmail: null, pendingPhone: null, contactChangeCode: null,
        contactChangeExpiresAt: null, contactChangeAttempts: 0, contactChangeLastSentAt: null,
      }, select: vendorProfileSelect });
    });
    return res.json({ success: true, message: "Vendor contact information updated successfully", vendor: updated });
  } catch (error) {
    if (isPhoneUniqueError(error)) {
      return res.status(409).json({ success: false, message: "Phone number is already in use" });
    }
    if (process.env.NODE_ENV !== "production") console.error("Vendor contact verification failed:", error?.message);
    return res.status(500).json({ success: false, message: "Unable to verify contact change" });
  }
};

