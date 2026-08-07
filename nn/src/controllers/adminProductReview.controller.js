import prisma from "../lib/prisma.js";
import {
  getEffectiveCommission,
  getProductSellingPrice,
  validateCommission,
} from "../utils/commission.js";

const ALLOWED_REVIEW_STATUSES = ["APPROVED", "REJECTED"];

/**
 * Request IP address বের করে।
 * ActivityLog-এ ব্যবহার হবে।
 */
const getRequestIp = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string") {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || null;
};

/**
 * Product approval/rejection-এর জন্য secure admin controller।
 *
 * এই controller শুধু নিচের field ব্যবহার করে:
 * - categoryId
 * - commissionType
 * - commissionValue
 * - status
 * - rejectionReason
 *
 * Request body-তে name, price, stock, description ইত্যাদি পাঠালেও
 * সেগুলো database update-এ ব্যবহার করা হবে না।
 */
export const reviewProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      categoryId,
      commissionType,
      commissionValue,
      status,
      rejectionReason,
    } = req.body;

    /*
     * Product existence এবং প্রয়োজনীয় relation একবারেই load করা হচ্ছে।
     */
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        vendor: {
          select: {
            id: true,
            userId: true,
            shopName: true,
            defaultCommissionType: true,
            defaultCommissionValue: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        images: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    /*
     * Admin এই endpoint দিয়ে শুধু APPROVED অথবা REJECTED করতে পারবে।
     */
    if (!ALLOWED_REVIEW_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be APPROVED or REJECTED",
      });
    }

    /*
     * categoryId required।
     * Product-এর existing category থাকলে request-এ আবার পাঠানো বাধ্যতামূলক নয়।
     */
    const effectiveCategoryId = categoryId || product.categoryId;

    if (!effectiveCategoryId) {
      return res.status(400).json({
        success: false,
        message: "Category is required before reviewing the product",
      });
    }

    /*
     * Request-এ নতুন categoryId থাকলে category সত্যিই আছে কি না check করে।
     */
    if (categoryId) {
      const categoryExists = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { id: true },
      });

      if (!categoryExists) {
        return res.status(404).json({
          success: false,
          message: "Selected category not found",
        });
      }
    }

    /*
     * Approve করার সময় অন্তত একটি product image থাকা দরকার।
     */
    if (status === "APPROVED" && product.images.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Product must have at least one image before approval",
      });
    }

    /*
     * Reject করলে reason বাধ্যতামূলক।
     */
    const trimmedRejectionReason =
      typeof rejectionReason === "string"
        ? rejectionReason.trim()
        : "";

    if (status === "REJECTED" && !trimmedRejectionReason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    /*
     * Commission input rules:
     *
     * 1. commissionType এবং commissionValue দুটোই blank হলে:
     *    Product custom commission remove হবে এবং default commission চলবে।
     *
     * 2. একটি দিলে অন্যটিও দিতে হবে।
     */
    const hasCommissionType =
      commissionType !== undefined &&
      commissionType !== null &&
      commissionType !== "";

    const hasCommissionValue =
      commissionValue !== undefined &&
      commissionValue !== null &&
      commissionValue !== "";

    if (hasCommissionType !== hasCommissionValue) {
      return res.status(400).json({
        success: false,
        message:
          "Commission type and commission value must be provided together",
      });
    }

    let customCommissionType = null;
    let customCommissionValue = null;

    if (hasCommissionType && hasCommissionValue) {
      const sellingPrice = getProductSellingPrice(product);

      const validation = validateCommission({
        commissionType,
        commissionValue,
        unitPrice: sellingPrice,
      });

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.message,
        });
      }

      customCommissionType = commissionType;
      customCommissionValue = Number(commissionValue);
    }

    /*
     * Global setting load করা হচ্ছে যাতে response-এ effective
     * commission source ও preview দেখানো যায়।
     */
    const platformSetting = await prisma.platformSetting.findUnique({
      where: { id: "GLOBAL" },
    });

    const proposedProductCommission = {
      ...product,
      commissionType: customCommissionType,
      commissionValue: customCommissionValue,
    };

    const effectiveCommission = getEffectiveCommission({
      product: proposedProductCommission,
      vendor: product.vendor,
      platformSetting,
    });

    /*
     * Transaction:
     * - Product update
     * - Vendor notification
     * - Activity log
     *
     * একটির failure হলে সব rollback হবে।
     */
  const isApproved = status === "APPROVED";
const reviewedAt = new Date();

const productUpdateOperation = prisma.product.update({
  where: { id: product.id },
  data: {
    categoryId: effectiveCategoryId,

    commissionType: customCommissionType,
    commissionValue: customCommissionValue,

    status,

    rejectionReason:
      status === "REJECTED" ? trimmedRejectionReason : null,

    approvedById: req.user.id,

    approvedAt: isApproved ? reviewedAt : null,
    rejectedAt: isApproved ? null : reviewedAt,
  },
  include: {
    category: {
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
        userId: true,
      },
    },
    images: true,
    variants: true,
  },
});

const notificationOperation = prisma.notification.create({
  data: {
    userId: product.vendor.userId,
    title: isApproved
      ? "Product Approved"
      : "Product Rejected",
    message: isApproved
      ? `Your product "${product.name}" has been approved and is now available publicly.`
      : `Your product "${product.name}" was rejected. Reason: ${trimmedRejectionReason}`,
    type: isApproved
      ? "PRODUCT_APPROVED"
      : "PRODUCT_REJECTED",
    link: `/vendor/products/${product.id}`,
  },
});

const activityLogOperation = prisma.activityLog.create({
  data: {
    userId: req.user.id,
    action: isApproved
      ? "PRODUCT_APPROVED"
      : "PRODUCT_REJECTED",
    entityType: "PRODUCT",
    entityId: product.id,

    oldData: {
      status: product.status,
      categoryId: product.categoryId,
      commissionType: product.commissionType,
      commissionValue: product.commissionValue,
      rejectionReason: product.rejectionReason,
    },

    newData: {
      status,
      categoryId: effectiveCategoryId,
      commissionType: customCommissionType,
      commissionValue: customCommissionValue,
      effectiveCommissionType:
        effectiveCommission.commissionType,
      effectiveCommissionValue:
        effectiveCommission.commissionValue,
      effectiveCommissionSource:
        effectiveCommission.source,
      rejectionReason:
        status === "REJECTED"
          ? trimmedRejectionReason
          : null,
    },

    ipAddress: getRequestIp(req),
    userAgent: req.headers["user-agent"] || null,
  },
});

const [result] = await prisma.$transaction([
  productUpdateOperation,
  notificationOperation,
  activityLogOperation,
]);

    return res.status(200).json({
      success: true,
      message:
        status === "APPROVED"
          ? "Product approved successfully"
          : "Product rejected successfully",

      product: result,

      effectiveCommission: {
        type: effectiveCommission.commissionType,
        value: effectiveCommission.commissionValue,
        source: effectiveCommission.source,
      },
    });
  } catch (error) {
    console.error("Admin Product Review Error:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message || "Unable to review product",
    });
  }
};
/**
 * একসঙ্গে একাধিক product approve/reject করে।
 *
 * একই category, commission এবং rejection reason
 * selected সব product-এর জন্য ব্যবহার হবে।
 *
 * Request body:
 * {
 *   productIds: [],
 *   status: "APPROVED" | "REJECTED",
 *   categoryId: "",
 *   commissionType: "PERCENTAGE" | "FIXED",
 *   commissionValue: 10,
 *   rejectionReason: ""
 * }
 */
export const bulkReviewProducts = async (req, res) => {
  try {
    const {
      products: requestedProducts,
      status,
      commissionType,
      commissionValue,
      rejectionReason,
    } = req.body;

    if (
      !Array.isArray(requestedProducts) ||
      requestedProducts.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "At least one product must be selected",
      });
    }

    if (requestedProducts.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Maximum 100 products can be reviewed at once",
      });
    }

    if (!ALLOWED_REVIEW_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be APPROVED or REJECTED",
      });
    }

    const normalizedProducts = requestedProducts
      .filter(
        (item) =>
          item &&
          typeof item.productId === "string" &&
          item.productId.trim()
      )
      .map((item) => ({
        productId: item.productId.trim(),
        categoryId:
          typeof item.categoryId === "string" &&
          item.categoryId.trim()
            ? item.categoryId.trim()
            : null,
      }));

    if (normalizedProducts.length !== requestedProducts.length) {
      return res.status(400).json({
        success: false,
        message: "Every selected item must contain a valid productId",
      });
    }

    const productIdSet = new Set(
      normalizedProducts.map((item) => item.productId)
    );

    if (productIdSet.size !== normalizedProducts.length) {
      return res.status(400).json({
        success: false,
        message: "Duplicate product IDs are not allowed",
      });
    }

    const trimmedRejectionReason =
      typeof rejectionReason === "string"
        ? rejectionReason.trim()
        : "";

    if (status === "REJECTED" && !trimmedRejectionReason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const hasCommissionType =
      commissionType !== undefined &&
      commissionType !== null &&
      commissionType !== "";

    const hasCommissionValue =
      commissionValue !== undefined &&
      commissionValue !== null &&
      commissionValue !== "";

    if (hasCommissionType !== hasCommissionValue) {
      return res.status(400).json({
        success: false,
        message:
          "Commission type and commission value must be provided together",
      });
    }

    const productIds = normalizedProducts.map(
      (item) => item.productId
    );

    const databaseProducts = await prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
      include: {
        vendor: {
          select: {
            id: true,
            userId: true,
            shopName: true,
            defaultCommissionType: true,
            defaultCommissionValue: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        images: {
          select: {
            id: true,
          },
        },
      },
    });

    if (databaseProducts.length !== productIds.length) {
      const foundIds = new Set(
        databaseProducts.map((product) => product.id)
      );

      const missingProductIds = productIds.filter(
        (productId) => !foundIds.has(productId)
      );

      return res.status(404).json({
        success: false,
        message: "One or more selected products were not found",
        missingProductIds,
      });
    }

    const nonPendingProducts = databaseProducts.filter(
      (product) => product.status !== "PENDING"
    );

    if (nonPendingProducts.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Only pending products can be reviewed",
        invalidProducts: nonPendingProducts.map((product) => ({
          id: product.id,
          name: product.name,
          status: product.status,
        })),
      });
    }

    const requestMap = new Map(
      normalizedProducts.map((item) => [
        item.productId,
        item,
      ])
    );

    /*
     * Approve করার সময় প্রতিটি item-এর categoryId required।
     * Reject করার সময় existing category রাখা হবে।
     */
    if (status === "APPROVED") {
      const missingCategoryProducts = normalizedProducts.filter(
        (item) => !item.categoryId
      );

      if (missingCategoryProducts.length > 0) {
        return res.status(400).json({
          success: false,
          message:
            "Category is required for every product before approval",
          invalidProducts: missingCategoryProducts,
        });
      }

      const categoryIds = [
        ...new Set(
          normalizedProducts.map((item) => item.categoryId)
        ),
      ];

      const existingCategories =
        await prisma.category.findMany({
          where: {
            id: {
              in: categoryIds,
            },
          },
          select: {
            id: true,
          },
        });

      const existingCategoryIds = new Set(
        existingCategories.map((category) => category.id)
      );

      const invalidCategoryItems = normalizedProducts.filter(
        (item) => !existingCategoryIds.has(item.categoryId)
      );

      if (invalidCategoryItems.length > 0) {
        return res.status(404).json({
          success: false,
          message: "One or more selected categories were not found",
          invalidProducts: invalidCategoryItems,
        });
      }

      const productsWithoutImage = databaseProducts.filter(
        (product) => product.images.length === 0
      );

      if (productsWithoutImage.length > 0) {
        return res.status(400).json({
          success: false,
          message:
            "Every product must have at least one image before approval",
          invalidProducts: productsWithoutImage.map((product) => ({
            id: product.id,
            name: product.name,
          })),
        });
      }
    }

    let customCommissionType = null;
    let customCommissionValue = null;

    if (hasCommissionType && hasCommissionValue) {
      const commissionErrors = [];

      for (const product of databaseProducts) {
        const sellingPrice = getProductSellingPrice(product);

        const validation = validateCommission({
          commissionType,
          commissionValue,
          unitPrice: sellingPrice,
        });

        if (!validation.valid) {
          commissionErrors.push({
            id: product.id,
            name: product.name,
            message: validation.message,
          });
        }
      }

      if (commissionErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Commission validation failed",
          invalidProducts: commissionErrors,
        });
      }

      customCommissionType = commissionType;
      customCommissionValue = Number(commissionValue);
    }

    const platformSetting =
      await prisma.platformSetting.findUnique({
        where: {
          id: "GLOBAL",
        },
      });

    const reviewedAt = new Date();
    const isApproved = status === "APPROVED";
    const ipAddress = getRequestIp(req);
    const userAgent = req.headers["user-agent"] || null;

    const transactionOperations = [];
    const commissionPreviews = [];

    for (const product of databaseProducts) {
      const requestedItem = requestMap.get(product.id);

      /*
       * Approve হলে request-এর category ব্যবহার হবে।
       * Reject হলে existing category অপরিবর্তিত থাকবে।
       */
      const effectiveCategoryId = isApproved
        ? requestedItem.categoryId
        : product.categoryId;

      const proposedProductCommission = {
        ...product,
        commissionType: customCommissionType,
        commissionValue: customCommissionValue,
      };

      const effectiveCommission = getEffectiveCommission({
        product: proposedProductCommission,
        vendor: product.vendor,
        platformSetting,
      });

      commissionPreviews.push({
        productId: product.id,
        categoryId: effectiveCategoryId,
        type: effectiveCommission.commissionType,
        value: effectiveCommission.commissionValue,
        source: effectiveCommission.source,
      });

      transactionOperations.push(
        prisma.product.update({
          where: {
            id: product.id,
          },
          data: {
            categoryId: effectiveCategoryId,
            commissionType: customCommissionType,
            commissionValue: customCommissionValue,
            status,
            rejectionReason: isApproved
              ? null
              : trimmedRejectionReason,
            approvedById: req.user.id,
            approvedAt: isApproved ? reviewedAt : null,
            rejectedAt: isApproved ? null : reviewedAt,
          },
          include: {
            category: {
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
                userId: true,
              },
            },
            images: true,
            variants: true,
          },
        })
      );

      transactionOperations.push(
        prisma.notification.create({
          data: {
            userId: product.vendor.userId,
            title: isApproved
              ? "Product Approved"
              : "Product Rejected",
            message: isApproved
              ? `Your product "${product.name}" has been approved and is now available publicly.`
              : `Your product "${product.name}" was rejected. Reason: ${trimmedRejectionReason}`,
            type: isApproved
              ? "PRODUCT_APPROVED"
              : "PRODUCT_REJECTED",
            link: `/vendor/products/${product.id}`,
          },
        })
      );

      transactionOperations.push(
        prisma.activityLog.create({
          data: {
            userId: req.user.id,
            action: isApproved
              ? "PRODUCT_APPROVED"
              : "PRODUCT_REJECTED",
            entityType: "PRODUCT",
            entityId: product.id,
            oldData: {
              status: product.status,
              categoryId: product.categoryId,
              commissionType: product.commissionType,
              commissionValue: product.commissionValue,
              rejectionReason: product.rejectionReason,
            },
            newData: {
              status,
              categoryId: effectiveCategoryId,
              commissionType: customCommissionType,
              commissionValue: customCommissionValue,
              effectiveCommissionType:
                effectiveCommission.commissionType,
              effectiveCommissionValue:
                effectiveCommission.commissionValue,
              effectiveCommissionSource:
                effectiveCommission.source,
              rejectionReason: isApproved
                ? null
                : trimmedRejectionReason,
            },
            ipAddress,
            userAgent,
          },
        })
      );
    }

    const transactionResults = await prisma.$transaction(
      transactionOperations
    );

    const reviewedProducts = transactionResults.filter(
      (_, index) => index % 3 === 0
    );

    return res.status(200).json({
      success: true,
      message: isApproved
        ? `${reviewedProducts.length} products approved successfully`
        : `${reviewedProducts.length} products rejected successfully`,
      reviewedCount: reviewedProducts.length,
      products: reviewedProducts,
      effectiveCommissions: commissionPreviews,
    });
  } catch (error) {
    console.error("Admin Bulk Product Review Error:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message || "Unable to review selected products",
    });
  }
};