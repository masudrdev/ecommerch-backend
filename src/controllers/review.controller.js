import prisma from "../lib/prisma.js";
import uploadToCloudinary from "../utils/uploadToCloudinary.js";
import deleteFromCloudinary from "../utils/deleteFromCloudinary.js";

const MAX_REVIEW_IMAGES = 3;
const REVIEW_IMAGE_UPLOAD_OPTIONS = { transformation: [{ width: 1600, height: 1600, crop: "limit" }, { quality: "auto:good", fetch_format: "auto" }] };
const cleanupCloudinaryImages = async (images = []) => { await Promise.allSettled(images.filter((image) => image?.publicId).map((image) => deleteFromCloudinary(image.publicId))); };
const uploadReviewImageFiles = async (files = []) => { const uploaded=[]; try { for (const file of files) { const result=await uploadToCloudinary(file.buffer, "friendbazar/reviews", REVIEW_IMAGE_UPLOAD_OPTIONS); uploaded.push({url:result.secure_url,publicId:result.public_id}); } return uploaded; } catch (_error) { await cleanupCloudinaryImages(uploaded); throw new Error("Unable to upload review images. Please try again."); } };
const parseKeptImageIds = (value, existingImages) => { if (value === undefined) return existingImages.map((image) => image.id); try { const parsed=JSON.parse(value || "[]"); if (!Array.isArray(parsed)) return null; const existingIds=new Set(existingImages.map((image)=>image.id)); if (parsed.some((id)=>typeof id !== "string" || !existingIds.has(id))) return null; return [...new Set(parsed)]; } catch (_error) { return null; } };
const getSafeMutationMessage = (error, fallback) => String(error?.message || "").startsWith("Unable to ") ? error.message : fallback;

const isAdminRole = (role) => {
  return ["ADMIN", "SUPER_ADMIN"].includes(role);
};

const normalizeRating = (rating) => {
  const value = Number(rating);
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    return null;
  }
  return value;
};

const getReviewerName = (review) => {
  return (
    review.user?.name ||
    review.user?.username ||
    review.reviewerName ||
    "Customer"
  );
};

const getReviewerAvatar = (review) => {
  return review.user?.avatar || review.reviewerAvatar || null;
};

export const createReview = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    const finalRating = normalizeRating(rating);

    if (!productId || !finalRating) {
      return res.status(400).json({
        success: false,
        message: "Product ID and valid rating are required",
      });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.status !== "APPROVED") {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const purchased = await prisma.orderItem.findFirst({
      where: {
        productId,
        order: {
          userId: req.user.id,
          orderStatus: {
            in: ["DELIVERED", "COMPLETED"],
          },
        },
      },
    });

    if (!purchased) {
      return res.status(403).json({
        success: false,
        message: "You can review only purchased products",
      });
    }

    const alreadyReviewed = await prisma.review.findFirst({
      where: {
        userId: req.user.id,
        productId,
      },
    });

    if (alreadyReviewed) {
      return res.status(400).json({
        success: false,
        message: "You already reviewed this product",
      });
    }

    const uploadedImages = await uploadReviewImageFiles(req.files || []);
    let review;
    try {
      review = await prisma.review.create({
      data: {
        userId: req.user.id,
        productId,
        rating: finalRating,
        comment: comment || "",
        source: "USER",
        images: uploadedImages.length ? { create: uploadedImages } : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: true,
          },
        },
        images: true,
      },
      });
    } catch (_error) {
      await cleanupCloudinaryImages(uploadedImages);
      throw new Error("Unable to submit review. Please try again.");
    }

    res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      review,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: getSafeMutationMessage(error, "Unable to submit review"),
    });
  }
};

export const createAdminCustomReview = async (req, res) => {
  try {
    const { productId, reviewerName, reviewerAvatar, rating, comment } = req.body;
    const finalRating = normalizeRating(rating);

    if (!productId || !reviewerName?.trim() || !finalRating) {
      return res.status(400).json({
        success: false,
        message: "Product, reviewer name and valid rating are required",
      });
    }

const product = await prisma.product.findUnique({
  where: { id: productId },
  include: {
    vendor: {
      select: {
        id: true,
        userId: true,
        shopName: true,
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

    const uploadedImages = await uploadReviewImageFiles(req.files || []);
    let review;
    try {
      review = await prisma.review.create({
      data: {
        productId,
        userId: null,
        reviewerName: reviewerName.trim(),
        reviewerAvatar: reviewerAvatar?.trim() || null,
        rating: finalRating,
        comment: comment?.trim() || "",
        source: "ADMIN",
        images: uploadedImages.length ? { create: uploadedImages } : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: true,
          },
        },
        images: true,
      },
      });
    } catch (_error) {
      await cleanupCloudinaryImages(uploadedImages);
      throw new Error("Unable to create review. Please try again.");
    }
    if (product.vendor?.userId) {
  await prisma.notification.create({
    data: {
      userId: product.vendor.userId,
      title: "New review added",
      message: `${reviewerName.trim()} added a ${finalRating}-star review on ${product.name}`,
      type: "NEW_REVIEW",
      link: `/dashboard/reviews`,
    },
  });
}

    res.status(201).json({
      success: true,
      message: "Custom review created successfully",
      review,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: getSafeMutationMessage(error, "Unable to create review"),
    });
  }
};

export const getAdminReviews = async (req, res) => {
  try {
    const {
      search = "",
      productId = "",
      rating = "",
      source = "",
      page = 1,
      limit = 20,
    } = req.query;

    const currentPage = Math.max(Number(page) || 1, 1);
    const take = Math.max(Number(limit) || 20, 1);
    const skip = (currentPage - 1) * take;

    const where = {};

    if (productId) {
      where.productId = productId;
    }

    if (rating) {
      const finalRating = normalizeRating(rating);
      if (finalRating) {
        where.rating = finalRating;
      }
    }

    if (source && ["USER", "ADMIN"].includes(source)) {
      where.source = source;
    }

    if (search.trim()) {
      const keyword = search.trim();

      where.OR = [
        {
          comment: {
            contains: keyword,
            mode: "insensitive",
          },
        },
        {
          reviewerName: {
            contains: keyword,
            mode: "insensitive",
          },
        },
        {
          product: {
            name: {
              contains: keyword,
              mode: "insensitive",
            },
          },
        },
        {
          user: {
            name: {
              contains: keyword,
              mode: "insensitive",
            },
          },
        },
        {
          user: {
            username: {
              contains: keyword,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    const [reviews, total, allReviews, products] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take,
      }),

      prisma.review.count({ where }),

      prisma.review.findMany({
        select: {
          rating: true,
          source: true,
        },
      }),

      prisma.product.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    const totalReviews = allReviews.length;
    const ratingSum = allReviews.reduce((sum, item) => sum + item.rating, 0);

    const formattedReviews = reviews.map((review) => ({
      ...review,
      displayReviewerName: getReviewerName(review),
      displayReviewerAvatar: getReviewerAvatar(review),
    }));

    const stats = {
      totalReviews,
      averageRating: totalReviews
        ? Number((ratingSum / totalReviews).toFixed(1))
        : 0,
      adminAdded: allReviews.filter((item) => item.source === "ADMIN").length,
      userAdded: allReviews.filter((item) => item.source !== "ADMIN").length,
      ratingBreakdown: {
        5: allReviews.filter((item) => item.rating === 5).length,
        4: allReviews.filter((item) => item.rating === 4).length,
        3: allReviews.filter((item) => item.rating === 3).length,
        2: allReviews.filter((item) => item.rating === 2).length,
        1: allReviews.filter((item) => item.rating === 1).length,
      },
    };

    res.json({
      success: true,
      reviews: formattedReviews,
      products,
      stats,
      pagination: {
        total,
        page: currentPage,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;

    const reviews = await prisma.review.findMany({
      where: {
        productId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
        images: { orderBy: { createdAt: "asc" } },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const average = await prisma.review.aggregate({
      where: {
        productId,
      },
      _avg: {
        rating: true,
      },
      _count: {
        rating: true,
      },
    });

    const formattedReviews = reviews.map((review) => ({
      ...review,
      displayReviewerName: getReviewerName(review),
      displayReviewerAvatar: getReviewerAvatar(review),
    }));

    res.json({
      success: true,
      averageRating: average._avg.rating || 0,
      totalReviews: average._count.rating || 0,
      reviews: formattedReviews,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMyReviews = async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { userId: req.user.id },
      include: {
        product: {
          select: { id: true, name: true, slug: true, images: true },
        },
        images: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    const reviewedProductIds = reviews.map((review) => review.productId);
    const eligibleOrderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          userId: req.user.id,
          orderStatus: { in: ["DELIVERED", "COMPLETED"] },
        },
        ...(reviewedProductIds.length ? { productId: { notIn: reviewedProductIds } } : {}),
        product: { status: "APPROVED" },
      },
      select: {
        productId: true,
        order: { select: { id: true, orderNumber: true, orderStatus: true } },
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
      orderBy: { order: { createdAt: "desc" } },
    });

    const seenProductIds = new Set();
    const eligibleReviews = eligibleOrderItems.filter((item) => {
      if (seenProductIds.has(item.productId)) return false;
      seenProductIds.add(item.productId);
      return true;
    });

    return res.json({ success: true, reviews, eligibleReviews });
  } catch (_error) {
    return res.status(500).json({
      success: false,
      message: "Unable to load reviews",
    });
  }
};

export const getVendorReviews = async (req, res) => {
  try {
    const {
      search = "",
      rating = "",
      replyStatus = "",
      page = 1,
      limit = 10,
    } = req.query;

    const currentPage = Math.max(Number(page) || 1, 1);
    const take = Math.max(Number(limit) || 10, 1);
    const skip = (currentPage - 1) * take;

    const vendor = await prisma.vendor.findUnique({
      where: {
        userId: req.user.id,
      },
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor profile not found",
      });
    }

    const baseWhere = {
      product: {
        vendorId: vendor.id,
      },
    };

    const where = {
      ...baseWhere,
    };

    if (rating) {
      const finalRating = normalizeRating(rating);
      if (finalRating) {
        where.rating = finalRating;
      }
    }

    if (replyStatus === "replied") {
      where.vendorReply = {
        not: null,
      };
    }

    if (replyStatus === "unreplied") {
      where.vendorReply = null;
    }

    if (search.trim()) {
      where.OR = [
        {
          comment: {
            contains: search.trim(),
            mode: "insensitive",
          },
        },
        {
          reviewerName: {
            contains: search.trim(),
            mode: "insensitive",
          },
        },
        {
          product: {
            name: {
              contains: search.trim(),
              mode: "insensitive",
            },
          },
        },
        {
          user: {
            name: {
              contains: search.trim(),
              mode: "insensitive",
            },
          },
        },
        {
          user: {
            username: {
              contains: search.trim(),
              mode: "insensitive",
            },
          },
        },
      ];
    }

    const [reviews, total, allReviews] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take,
      }),

      prisma.review.count({ where }),

      prisma.review.findMany({
        where: baseWhere,
        select: {
          rating: true,
          vendorReply: true,
        },
      }),
    ]);

    const totalReviews = allReviews.length;
    const ratingSum = allReviews.reduce((sum, item) => sum + item.rating, 0);

    const formattedReviews = reviews.map((review) => ({
      ...review,
      displayReviewerName: getReviewerName(review),
      displayReviewerAvatar: getReviewerAvatar(review),
    }));

    const stats = {
      totalReviews,
      averageRating: totalReviews
        ? Number((ratingSum / totalReviews).toFixed(1))
        : 0,
      replied: allReviews.filter((item) => item.vendorReply).length,
      unreplied: allReviews.filter((item) => !item.vendorReply).length,
      ratingBreakdown: {
        5: allReviews.filter((item) => item.rating === 5).length,
        4: allReviews.filter((item) => item.rating === 4).length,
        3: allReviews.filter((item) => item.rating === 3).length,
        2: allReviews.filter((item) => item.rating === 2).length,
        1: allReviews.filter((item) => item.rating === 1).length,
      },
    };

    res.json({
      success: true,
      reviews: formattedReviews,
      stats,
      pagination: {
        total,
        page: currentPage,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error("Vendor reviews error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getVendorProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;

    const vendor = await prisma.vendor.findUnique({
      where: {
        userId: req.user.id,
      },
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor profile not found",
      });
    }

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        vendorId: vendor.id,
      },
    });

    if (!product) {
      return res.status(403).json({
        success: false,
        message: "Product not found or access denied",
      });
    }

    const reviews = await prisma.review.findMany({
      where: {
        productId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedReviews = reviews.map((review) => ({
      ...review,
      displayReviewerName: getReviewerName(review),
      displayReviewerAvatar: getReviewerAvatar(review),
    }));

    res.json({
      success: true,
      reviews: formattedReviews,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const replyVendorReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { reply } = req.body;

    if (!reply || !reply.trim()) {
      return res.status(400).json({
        success: false,
        message: "Reply is required",
      });
    }

    const vendor = await prisma.vendor.findUnique({
      where: {
        userId: req.user.id,
      },
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor profile not found",
      });
    }

    const review = await prisma.review.findUnique({
      where: {
        id: reviewId,
      },
      include: {
        product: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!review || review.product.vendorId !== vendor.id) {
      return res.status(403).json({
        success: false,
        message: "Review not found or access denied",
      });
    }

    const updatedReview = await prisma.review.update({
      where: {
        id: reviewId,
      },
      data: {
        vendorReply: reply.trim(),
        vendorRepliedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: true,
          },
        },
      },
    });

    if (review.userId) {
      await prisma.notification.create({
        data: {
          userId: review.userId,
          title: "Vendor replied to your review",
          message: `Vendor replied to your review on ${review.product.name}`,
          type: "REVIEW_REPLY",
          link: `/products/${review.product.slug || review.product.id}`,
        },
      });
    }

    res.json({
      success: true,
      message: "Reply submitted successfully",
      review: {
        ...updatedReview,
        displayReviewerName: getReviewerName(updatedReview),
        displayReviewerAvatar: getReviewerAvatar(updatedReview),
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment, keepImageIds } = req.body;
    const review = await prisma.review.findUnique({ where: { id }, include: { images: true } });
    if (!review || review.userId !== req.user.id) return res.status(404).json({ success: false, message: "Review not found" });
    const finalRating = rating ? normalizeRating(rating) : review.rating;
    if (!finalRating) return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
    const keptIds = parseKeptImageIds(keepImageIds, review.images);
    if (!keptIds) return res.status(400).json({ success: false, message: "Invalid review image selection" });
    const newFiles = req.files || [];
    if (keptIds.length + newFiles.length > MAX_REVIEW_IMAGES) return res.status(400).json({ success: false, message: "You can upload up to 3 images per review." });
    const removedImages = review.images.filter((image) => !keptIds.includes(image.id));
    const uploadedImages = await uploadReviewImageFiles(newFiles);
    let updated;
    try {
      updated = await prisma.review.update({ where: { id }, data: { rating: finalRating, comment, images: { deleteMany: removedImages.map((image) => ({ id: image.id })), create: uploadedImages } }, include: { images: true } });
    } catch (_error) { await cleanupCloudinaryImages(uploadedImages); throw new Error("Unable to update review. Please try again."); }
    await cleanupCloudinaryImages(removedImages);
    return res.json({ success: true, message: "Review updated successfully", review: updated });
  } catch (error) { return res.status(400).json({ success: false, message: getSafeMutationMessage(error, "Unable to update review") }); }
};

export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await prisma.review.findUnique({ where: { id }, include: { images: true } });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    const isOwner = review.userId === req.user.id;
    const isAdmin = isAdminRole(req.user.role);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    await prisma.review.delete({ where: { id } });
    await cleanupCloudinaryImages(review.images);

    res.json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Unable to delete review",
    });
  }
};