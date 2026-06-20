import prisma from "../lib/prisma.js";
import { productSchema } from "../validations/product.validation.js";
import uploadToCloudinary from "../utils/uploadToCloudinary.js";

export const createProduct = async (req, res) => {
  try {
    const data = productSchema.parse(req.body);

    const vendor = await prisma.vendor.findUnique({
      where: { userId: req.user.id },
    });

    if (!vendor || vendor.status !== "APPROVED") {
      return res.status(403).json({
        success: false,
        message: "Vendor is not approved",
      });
    }

    const exists = await prisma.product.findUnique({
      where: { slug: data.slug },
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Product slug already exists",
      });
    }

    const product = await prisma.product.create({
      data: {
        ...data,
        vendorId: vendor.id,
        userId: req.user.id,
        status: "PENDING",
      },
    });

    res.status(201).json({
      success: true,
      message: "Product created successfully. Waiting for admin approval.",
      product,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// export const getProducts = async (req, res) => {
//   try {
//     const products = await prisma.product.findMany({
//       where: { status: "APPROVED" },
//       include: {
//         category: true,
//         brand: true,
//         vendor: {
//           select: {
//             id: true,
//             shopName: true,
//             shopSlug: true,
//           },
//         },
//         images: true,
//         variants: true,
//       },
//       orderBy: { createdAt: "desc" },
//     });

//     res.json({
//       success: true,
//       products,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
export const getProducts = async (req, res) => {
  try {
    const {
      search,
      category,
      brand,
      vendor,
      minPrice,
      maxPrice,
      sort = "latest",
      page = 1,
      limit = 12,
    } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const where = {
      status: "APPROVED",
    };

    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    if (category) {
      where.category = {
        slug: category,
      };
    }

    if (brand) {
      where.brand = {
        slug: brand,
      };
    }

    if (vendor) {
      where.vendor = {
        shopSlug: vendor,
      };
    }

    if (minPrice || maxPrice) {
      where.OR = [
        {
          salePrice: {
            gte: minPrice ? Number(minPrice) : undefined,
            lte: maxPrice ? Number(maxPrice) : undefined,
          },
        },
        {
          price: {
            gte: minPrice ? Number(minPrice) : undefined,
            lte: maxPrice ? Number(maxPrice) : undefined,
          },
        },
      ];
    }

    let orderBy = { createdAt: "desc" };

    if (sort === "price-low") {
      orderBy = { price: "asc" };
    }

    if (sort === "price-high") {
      orderBy = { price: "desc" };
    }

    if (sort === "oldest") {
      orderBy = { createdAt: "asc" };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          brand: true,
          vendor: {
            select: {
              id: true,
              shopName: true,
              shopSlug: true,
            },
          },
          images: true,
          variants: true,
        },
        orderBy,
        skip,
        take: limitNumber,
      }),

      prisma.product.count({ where }),
    ]);

    res.json({
      success: true,
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getProductBySlug = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: req.params.slug },
      include: {
        category: true,
        brand: true,
        vendor: {
          select: {
            id: true,
            shopName: true,
            shopSlug: true,
            shopLogo: true,
          },
        },
        images: true,
        variants: true,
        reviews: true,
      },
    });

    if (!product || product.status !== "APPROVED") {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const updateProductStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatus = ["PENDING", "APPROVED", "REJECTED", "DRAFT"];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product status",
      });
    }

    const product = await prisma.product.update({
      where: { id },
      data: { status },
    });
await createNotification({
  userId: product.userId,
  title: "Product Approved",
  message: `${product.name} has been approved.`,
  type: "PRODUCT_APPROVED",
  link: `/vendor/products/${product.id}`,
});
    res.json({
      success: true,
      message: "Product status updated successfully",
      product,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
export const uploadProductImages = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: { vendor: true },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (product.vendor.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You can upload images only for your own product",
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No images uploaded",
      });
    }

    const uploadedImages = [];

    for (const file of req.files) {
      const result = await uploadToCloudinary(file.buffer);

      const image = await prisma.productImage.create({
        data: {
          productId: product.id,
          url: result.secure_url,
          publicId: result.public_id,
        },
      });

      uploadedImages.push(image);
    }

    res.status(201).json({
      success: true,
      message: "Product images uploaded successfully",
      images: uploadedImages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const addProductVariants = async (req, res) => {
  try {
    const { id } = req.params;
    const { variants } = req.body;

    const product = await prisma.product.findUnique({
      where: { id },
      include: { vendor: true },
    });

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (product.vendor.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not your product" });
    }

    const created = await prisma.productVariant.createMany({
      data: variants.map((item) => ({
        productId: id,
        size: item.size,
        color: item.color,
        sku: item.sku,
        stock: item.stock || 0,
        price: item.price,
      })),
    });

    res.status(201).json({
      success: true,
      message: "Product variants added successfully",
      created,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: { vendor: true },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (product.vendor.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not your product",
      });
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: req.body,
    });

    res.json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: { vendor: true },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (product.vendor.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not your product",
      });
    }

    await prisma.product.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};