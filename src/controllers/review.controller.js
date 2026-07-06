// import prisma from "../lib/prisma.js";

// export const createReview = async (req, res) => {
//   try {
//     const { productId, rating, comment } = req.body;

//     if (!productId || !rating) {
//       return res.status(400).json({
//         success: false,
//         message: "Product ID and rating are required",
//       });
//     }

//     if (rating < 1 || rating > 5) {
//       return res.status(400).json({
//         success: false,
//         message: "Rating must be between 1 and 5",
//       });
//     }

//     const product = await prisma.product.findUnique({
//       where: { id: productId },
//     });

//     if (!product || product.status !== "APPROVED") {
//       return res.status(404).json({
//         success: false,
//         message: "Product not found",
//       });
//     }

//     const purchased = await prisma.orderItem.findFirst({
//       where: {
//         productId,
//         order: {
//           userId: req.user.id,
//           orderStatus: {
//             in: ["DELIVERED", "COMPLETED"],
//           },
//         },
//       },
//     });

//     if (!purchased) {
//       return res.status(403).json({
//         success: false,
//         message: "You can review only purchased products",
//       });
//     }

//     const alreadyReviewed = await prisma.review.findFirst({
//       where: {
//         userId: req.user.id,
//         productId,
//       },
//     });

//     if (alreadyReviewed) {
//       return res.status(400).json({
//         success: false,
//         message: "You already reviewed this product",
//       });
//     }

//     const review = await prisma.review.create({
//       data: {
//         userId: req.user.id,
//         productId,
//         rating,
//         comment,
//       },
//     });

//     res.status(201).json({
//       success: true,
//       message: "Review submitted successfully",
//       review,
//     });
//   } catch (error) {
//     res.status(400).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// export const getProductReviews = async (req, res) => {
//   try {
//     const { productId } = req.params;

//     const reviews = await prisma.review.findMany({
//       where: { productId },
//       include: {
//         user: {
//           select: {
//             id: true,
//             name: true,
//             username: true,
//             avatar: true,
//           },
//         },
//       },
//       orderBy: { createdAt: "desc" },
//     });

//     const average = await prisma.review.aggregate({
//       where: { productId },
//       _avg: { rating: true },
//       _count: { rating: true },
//     });

//     res.json({
//       success: true,
//       averageRating: average._avg.rating || 0,
//       totalReviews: average._count.rating || 0,
//       reviews,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
// export const getMyReviews = async (req, res) => {
//   try {
//     const reviews = await prisma.review.findMany({
//       where: {
//         userId: req.user.id,
//       },
//       include: {
//         product: {
//           select: {
//             id: true,
//             name: true,
//             slug: true,
//             //mainImage: true,
//           },
//         },
//       },
//       orderBy: {
//         createdAt: "desc",
//       },
//     });

//     res.json({
//       success: true,
//       reviews,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// export const updateReview = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { rating, comment } = req.body;

//     const review = await prisma.review.findUnique({
//       where: { id },
//     });

//     if (!review || review.userId !== req.user.id) {
//       return res.status(404).json({
//         success: false,
//         message: "Review not found",
//       });
//     }

//     if (rating && (rating < 1 || rating > 5)) {
//       return res.status(400).json({
//         success: false,
//         message: "Rating must be between 1 and 5",
//       });
//     }

//     const updated = await prisma.review.update({
//       where: { id },
//       data: {
//         rating: rating || review.rating,
//         comment,
//       },
//     });

//     res.json({
//       success: true,
//       message: "Review updated successfully",
//       review: updated,
//     });
//   } catch (error) {
//     res.status(400).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// export const deleteReview = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const review = await prisma.review.findUnique({
//       where: { id },
//     });

//     if (!review) {
//       return res.status(404).json({
//         success: false,
//         message: "Review not found",
//       });
//     }

//     const isOwner = review.userId === req.user.id;
//     const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(req.user.role);

//     if (!isOwner && !isAdmin) {
//       return res.status(403).json({
//         success: false,
//         message: "Access denied",
//       });
//     }

//     await prisma.review.delete({
//       where: { id },
//     });

//     res.json({
//       success: true,
//       message: "Review deleted successfully",
//     });
//   } catch (error) {
//     res.status(400).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

import prisma from "../lib/prisma.js";

export const createReview = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;

    if (!productId || !rating) {
      return res.status(400).json({
        success: false,
        message: "Product ID and rating are required",
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
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
          orderStatus: { in: ["DELIVERED", "COMPLETED"] },
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
      where: { userId: req.user.id, productId },
    });

    if (alreadyReviewed) {
      return res.status(400).json({
        success: false,
        message: "You already reviewed this product",
      });
    }

    const review = await prisma.review.create({
      data: { userId: req.user.id, productId, rating, comment },
    });

    res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      review,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;

    const reviews = await prisma.review.findMany({
      where: { productId },
      include: {
        user: {
          select: { id: true, name: true, username: true, avatar: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const average = await prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    res.json({
      success: true,
      averageRating: average._avg.rating || 0,
      totalReviews: average._count.rating || 0,
      reviews,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
      where: { userId: req.user.id },
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor profile not found",
      });
    }

    const baseWhere = {
      product: { vendorId: vendor.id },
    };

    const where = { ...baseWhere };

    if (rating) where.rating = Number(rating);

    if (replyStatus === "replied") {
      where.vendorReply = { not: null };
    }

    if (replyStatus === "unreplied") {
      where.vendorReply = null;
    }

    if (search.trim()) {
      where.OR = [
        { comment: { contains: search.trim(), mode: "insensitive" } },
        { product: { name: { contains: search.trim(), mode: "insensitive" } } },
        { user: { name: { contains: search.trim(), mode: "insensitive" } } },
        { user: { username: { contains: search.trim(), mode: "insensitive" } } },
      ];
    }

    const [reviews, total, allReviews] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, username: true, avatar: true },
          },
          product: {
            select: { id: true, name: true, slug: true, images: true },
          },
        },
        orderBy: { createdAt: "desc" },
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
    const averageRating = totalReviews ? Number((ratingSum / totalReviews).toFixed(1)) : 0;

    const stats = {
      totalReviews,
      averageRating,
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
      reviews,
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
      where: { userId: req.user.id },
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor profile not found",
      });
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, vendorId: vendor.id },
    });

    if (!product) {
      return res.status(403).json({
        success: false,
        message: "Product not found or access denied",
      });
    }

    const reviews = await prisma.review.findMany({
      where: { productId },
      include: {
        user: {
          select: { id: true, name: true, username: true, avatar: true },
        },
        product: {
          select: { id: true, name: true, slug: true, images: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
      where: { userId: req.user.id },
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor profile not found",
      });
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        product: true,
        user: {
          select: { id: true, name: true },
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
      where: { id: reviewId },
      data: {
        vendorReply: reply.trim(),
        vendorRepliedAt: new Date(),
      },
      include: {
        user: {
          select: { id: true, name: true, username: true, avatar: true },
        },
        product: {
          select: { id: true, name: true, slug: true, images: true },
        },
      },
    });

    await prisma.notification.create({
      data: {
        userId: review.userId,
        title: "Vendor replied to your review",
        message: `Vendor replied to your review on ${review.product.name}`,
        type: "REVIEW_REPLY",
        link: `/products/${review.product.slug || review.product.id}`,
      },
    });

    res.json({
      success: true,
      message: "Reply submitted successfully",
      review: updatedReview,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    const review = await prisma.review.findUnique({ where: { id } });

    if (!review || review.userId !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    const updated = await prisma.review.update({
      where: { id },
      data: {
        rating: rating || review.rating,
        comment,
      },
    });

    res.json({
      success: true,
      message: "Review updated successfully",
      review: updated,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await prisma.review.findUnique({ where: { id } });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    const isOwner = review.userId === req.user.id;
    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(req.user.role);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    await prisma.review.delete({ where: { id } });

    res.json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};