import prisma from "../lib/prisma.js";
import { createNotification } from "../services/notification.service.js";
import { productSchema } from "../validations/product.validation.js";
import uploadToCloudinary from "../utils/uploadToCloudinary.js";
import deleteFromCloudinary from "../utils/deleteFromCloudinary.js";


// export const createProduct = async (req, res) => {
//   try {
//     const data = productSchema.parse(req.body);

//     const vendor = await prisma.vendor.findUnique({
//       where: { userId: req.user.id },
//     });

//     if (!vendor || vendor.status !== "APPROVED") {
//       return res.status(403).json({
//         success: false,
//         message: "Vendor is not approved",
//       });
//     }

//     const exists = await prisma.product.findUnique({
//       where: { slug: data.slug },
//     });

//     if (exists) {
//       return res.status(400).json({
//         success: false,
//         message: "Product slug already exists",
//       });
//     }

//     const product = await prisma.product.create({
//       data: {
//         ...data,
//         vendorId: vendor.id,
//         userId: req.user.id,
//         status: "PENDING",
//       },
//     });

//     res.status(201).json({
//       success: true,
//       message: "Product created successfully. Waiting for admin approval.",
//       product,
//     });
//   } catch (error) {
//     res.status(400).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

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
const slugify = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");

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

    const baseSlug = data.slug || slugify(data.name);
    let finalSlug = baseSlug;
    let counter = 1;

    while (await prisma.product.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug: finalSlug,
        description: data.description,
        price: data.price,
        salePrice: data.salePrice,
        stock: data.stock,
        deliveryCharge: data.deliveryCharge,
        outsideDistrictExtraCharge: data.outsideDistrictExtraCharge,
        categoryId: data.categoryId || null,
        brandId: data.brandId || null,
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
    const { isMain = "false" } = req.body;

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

    const mainImage = isMain === "true";

    if (mainImage) {
      await prisma.productImage.updateMany({
        where: { productId: product.id },
        data: { isMain: false },
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
          isMain: mainImage,
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

// export const updateProduct = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const product = await prisma.product.findUnique({
//       where: { id },
//       include: { vendor: true },
//     });

//     if (!product) {
//       return res.status(404).json({
//         success: false,
//         message: "Product not found",
//       });
//     }

//     const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(req.user.role);

//     if (!isAdmin && product.vendor.userId !== req.user.id) {
//       return res.status(403).json({
//         success: false,
//         message: "Not your product",
//       });
//     }

//     const data = {
//       name: req.body.name,
//       description: req.body.description,
//       price: Number(req.body.price),
//       salePrice:
//         req.body.salePrice === null ||
//         req.body.salePrice === ""
//           ? null
//           : Number(req.body.salePrice),

//       deliveryCharge: Number(req.body.deliveryCharge || 0),
//       outsideDistrictExtraCharge: Number(
//         req.body.outsideDistrictExtraCharge || 35
//       ),

//       stock: Number(req.body.stock || 0),

//       categoryId: req.body.categoryId || null,
//       brandId: req.body.brandId || null,
//     };

//     if (!isAdmin) {
//       data.status = "PENDING";
//     }

//     const updated = await prisma.product.update({
//       where: { id },
//       data,
//     });

//     res.json({
//       success: true,
//       message: "Product updated successfully.",
//       product: updated,
//     });
//   } catch (error) {
//     res.status(400).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        vendor: true,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(
      req.user.role
    );

    const isOwner =
      product.vendor.userId === req.user.id;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update this product",
      });
    }

    /*
     * ADMIN / SUPER_ADMIN
     * শুধু category এবং commission update করতে পারবে।
     */
    if (isAdmin) {
      const {
        categoryId,
        commissionType,
        commissionValue,
      } = req.body;

      if (!categoryId) {
        return res.status(400).json({
          success: false,
          message: "Category is required",
        });
      }

      const category = await prisma.category.findUnique({
        where: {
          id: categoryId,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Selected category not found",
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

      let normalizedCommissionType = null;
      let normalizedCommissionValue = null;

      if (hasCommissionType && hasCommissionValue) {
        if (
          !["PERCENTAGE", "FIXED"].includes(
            commissionType
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Commission type must be PERCENTAGE or FIXED",
          });
        }

        const numericCommissionValue =
          Number(commissionValue);

        if (
          !Number.isFinite(numericCommissionValue) ||
          numericCommissionValue < 0
        ) {
          return res.status(400).json({
            success: false,
            message: "Enter a valid commission value",
          });
        }

        if (
          commissionType === "PERCENTAGE" &&
          numericCommissionValue > 100
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Percentage commission cannot exceed 100",
          });
        }

        const sellingPrice =
          product.salePrice !== null &&
          product.salePrice !== undefined
            ? Number(product.salePrice)
            : Number(product.price);

        if (
          commissionType === "FIXED" &&
          numericCommissionValue > sellingPrice
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Fixed commission cannot exceed product selling price",
          });
        }

        normalizedCommissionType = commissionType;
        normalizedCommissionValue =
          numericCommissionValue;
      }

      const updatedProduct = await prisma.product.update({
        where: {
          id,
        },
        data: {
          categoryId,
          commissionType: normalizedCommissionType,
          commissionValue: normalizedCommissionValue,
        },
        include: {
          category: true,
          brand: true,
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

      return res.status(200).json({
        success: true,
        message:
          "Product category and commission updated successfully",
        product: updatedProduct,
      });
    }

    /*
     * VENDOR
     * Vendor নিজের product-এর normal editable fields update করবে।
     * Update করলে product আবার PENDING হবে।
     */
    const data = {
      name: req.body.name,
      description: req.body.description,
      price: Number(req.body.price),

      salePrice:
        req.body.salePrice === null ||
        req.body.salePrice === ""
          ? null
          : Number(req.body.salePrice),

      deliveryCharge: Number(
        req.body.deliveryCharge || 0
      ),

      outsideDistrictExtraCharge: Number(
        req.body.outsideDistrictExtraCharge || 35
      ),

      stock: Number(req.body.stock || 0),

      categoryId: req.body.categoryId || null,
      brandId: req.body.brandId || null,

      status: "PENDING",

      rejectionReason: null,
      approvedAt: null,
      rejectedAt: null,
    };

    const updatedProduct = await prisma.product.update({
      where: {
        id,
      },
      data,
      include: {
        category: true,
        brand: true,
        images: true,
        variants: true,
      },
    });

    return res.status(200).json({
      success: true,
      message:
        "Product updated successfully and submitted for admin review",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Update Product Error:", error);

    return res.status(400).json({
      success: false,
      message:
        error.message || "Unable to update product",
    });
  }
};
export const getMyVendorProducts = async (req, res) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { userId: req.user.id },
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const products = await prisma.product.findMany({
      where: { vendorId: vendor.id },
      include: {
        category: true,
        brand: true,
        images: true,
        variants: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      products,
    });
  } catch (error) {
    res.status(500).json({
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
export const getProductForManage = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true,
        vendor: true,
        images: true,
        variants: true,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const isOwner = product.vendor.userId === req.user.id;
    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(req.user.role);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to manage this product",
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
export const replaceProductVariants = async (req, res) => {
  try {
    const { id } = req.params;
    const { variants = [] } = req.body;

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

    await prisma.productVariant.deleteMany({
      where: { productId: id },
    });

    if (variants.length > 0) {
      await prisma.productVariant.createMany({
        data: variants.map((item) => ({
          productId: id,
          color: item.color || null,
          size: item.size || null,
          stock: Number(item.stock || 0),
          price: item.price ? Number(item.price) : null,
          sku: item.sku || null,
        })),
      });
    }

    const totalStock = variants.reduce(
      (sum, item) => sum + Number(item.stock || 0),
      0
    );

    await prisma.product.update({
      where: { id },
      data: { stock: totalStock },
    });

    res.json({
      success: true,
      message: "Product variants updated successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
export const deleteProductImage = async (req, res) => {
  try {
    const { imageId } = req.params;

    const image = await prisma.productImage.findUnique({
      where: { id: imageId },
      include: {
        product: {
          include: { vendor: true },
        },
      },
    });

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Image not found",
      });
    }

    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(req.user.role);

    if (!isAdmin && image.product.vendor.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not your product image",
      });
    }

    if (image.publicId) {
      await deleteFromCloudinary(image.publicId);
    }

    await prisma.productImage.delete({
      where: { id: imageId },
    });

    res.json({
      success: true,
      message: "Image deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


export const getAdminProducts = async (req, res) => {
  try {
    const {
      search = "",
      categoryId = "",
      vendorId = "",
      status = "ALL",
      sort = "newest",
      page = 1,
      limit = 20,
    } = req.query;

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.max(Number(limit) || 20, 1);
    const skip = (pageNumber - 1) * limitNumber;

    /**
     * Selected category-এর সব child ও grandchild ID বের করবে।
     *
     * Example:
     * Fashion
     * └── man
     *     └── pant
     *
     * Fashion select করলে:
     * [FashionId, manId, pantId]
     *
     * man select করলে:
     * [manId, pantId]
     *
     * pant select করলে:
     * [pantId]
     */
    const getCategoryAndDescendantIds = async (
      selectedCategoryId
    ) => {
      if (!selectedCategoryId) return [];

      const allCategories = await prisma.category.findMany({
        select: {
          id: true,
          parentId: true,
        },
      });

      const childrenMap = new Map();

      for (const category of allCategories) {
        const parentKey = category.parentId || null;

        if (!childrenMap.has(parentKey)) {
          childrenMap.set(parentKey, []);
        }

        childrenMap.get(parentKey).push(category.id);
      }

      const categoryIds = [];
      const queue = [selectedCategoryId];
      const visited = new Set();

      while (queue.length > 0) {
        const currentCategoryId = queue.shift();

        if (
          !currentCategoryId ||
          visited.has(currentCategoryId)
        ) {
          continue;
        }

        visited.add(currentCategoryId);
        categoryIds.push(currentCategoryId);

        const childIds =
          childrenMap.get(currentCategoryId) || [];

        queue.push(...childIds);
      }

      return categoryIds;
    };

    let categoryIds = [];

    if (categoryId) {
      const selectedCategory =
        await prisma.category.findUnique({
          where: {
            id: categoryId,
          },
          select: {
            id: true,
          },
        });

      if (!selectedCategory) {
        return res.status(404).json({
          success: false,
          message: "Selected category not found",
        });
      }

      categoryIds =
        await getCategoryAndDescendantIds(categoryId);
    }

    const where = {
      ...(search
        ? {
            name: {
              contains: search,
              mode: "insensitive",
            },
          }
        : {}),

      ...(categoryIds.length > 0
        ? {
            categoryId: {
              in: categoryIds,
            },
          }
        : {}),

      ...(vendorId
        ? {
            vendorId,
          }
        : {}),

      ...(status !== "ALL"
        ? {
            status,
          }
        : {}),
    };

    let orderBy = {
      createdAt: "desc",
    };

    if (sort === "oldest") {
      orderBy = {
        createdAt: "asc",
      };
    }

    if (
      sort === "price_low" ||
      sort === "price_asc"
    ) {
      orderBy = {
        salePrice: "asc",
      };
    }

    if (
      sort === "price_high" ||
      sort === "price_desc"
    ) {
      orderBy = {
        salePrice: "desc",
      };
    }

    if (
      sort === "stock_low" ||
      sort === "stock_asc"
    ) {
      orderBy = {
        stock: "asc",
      };
    }

    if (
      sort === "stock_high" ||
      sort === "stock_desc"
    ) {
      orderBy = {
        stock: "desc",
      };
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

      prisma.product.count({
        where,
      }),
    ]);

    return res.json({
      success: true,
      products,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.max(
          Math.ceil(total / limitNumber),
          1
        ),
      },
    });
  } catch (error) {
    console.error("Get Admin Products Error:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message || "Unable to load admin products",
    });
  }
};



// export const getAdminProducts = async (req, res) => {
//   try {
//     const {
//       search = "",
//       categoryId = "",
//       vendorId = "",
//       status = "ALL",
//       sort = "newest",
//       page = 1,
//       limit = 20,
//     } = req.query;

//     const skip = (Number(page) - 1) * Number(limit);

//     const where = {
//       ...(search
//         ? { name: { contains: search, mode: "insensitive" } }
//         : {}),
//       ...(categoryId ? { categoryId } : {}),
//       ...(vendorId ? { vendorId } : {}),
//       ...(status !== "ALL" ? { status } : {}),
//     };

//     let orderBy = { createdAt: "desc" };

//     if (sort === "oldest") orderBy = { createdAt: "asc" };
//     if (sort === "price_low") orderBy = { salePrice: "asc" };
//     if (sort === "price_high") orderBy = { salePrice: "desc" };
//     if (sort === "stock_low") orderBy = { stock: "asc" };
//     if (sort === "stock_high") orderBy = { stock: "desc" };

//     const [products, total] = await Promise.all([
//       prisma.product.findMany({
//         where,
//         include: {
//           category: true,
//           brand: true,
//           vendor: {
//             select: {
//               id: true,
//               shopName: true,
//               shopSlug: true,
//             },
//           },
//           images: true,
//           variants: true,
//         },
//         orderBy,
//         skip,
//         take: Number(limit),
//       }),

//       prisma.product.count({ where }),
//     ]);

//     res.json({
//       success: true,
//       products,
//       pagination: {
//         total,
//         page: Number(page),
//         limit: Number(limit),
//         totalPages: Math.ceil(total / Number(limit)),
//       },
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };


