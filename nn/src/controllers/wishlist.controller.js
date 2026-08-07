import prisma from "../lib/prisma.js";

export const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.status !== "APPROVED") {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const exists = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId: req.user.id,
          productId,
        },
      },
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Product already in wishlist",
      });
    }

    const wishlist = await prisma.wishlist.create({
      data: {
        userId: req.user.id,
        productId,
      },
    });

    res.status(201).json({
      success: true,
      message: "Product added to wishlist",
      wishlist,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getWishlist = async (req, res) => {
  try {
    const wishlist = await prisma.wishlist.findMany({
      where: { userId: req.user.id },
      include: {
        product: {
          include: {
            images: true,
            vendor: {
              select: {
                shopName: true,
                shopSlug: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      wishlist,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    await prisma.wishlist.delete({
      where: {
        userId_productId: {
          userId: req.user.id,
          productId,
        },
      },
    });

    res.json({
      success: true,
      message: "Product removed from wishlist",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Product not found in wishlist",
    });
  }
};