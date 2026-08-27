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

const normalizeSaleConfiguration = ({
  price,
  salePrice,
  flashSaleStart,
  flashSaleEnd,
}) => {
  const regularPrice = Number(price);
  if (!Number.isFinite(regularPrice) || regularPrice <= 0) {
    throw new Error("Regular price must be greater than 0");
  }

  const hasSalePrice =
    salePrice !== undefined && salePrice !== null && salePrice !== "";

  if (!hasSalePrice) {
    return {
      salePrice: null,
      flashSaleStart: null,
      flashSaleEnd: null,
    };
  }

  const normalizedSalePrice = Number(salePrice);
  if (!Number.isFinite(normalizedSalePrice) || normalizedSalePrice <= 0) {
    throw new Error("Sale price must be greater than 0");
  }

  if (normalizedSalePrice >= regularPrice) {
    throw new Error("Sale price must be lower than the regular price");
  }

  const hasStart = Boolean(flashSaleStart);
  const hasEnd = Boolean(flashSaleEnd);

  if (hasStart !== hasEnd) {
    throw new Error(
      "Provide both offer start and end times, or leave both empty"
    );
  }

  if (!hasStart) {
    return {
      salePrice: normalizedSalePrice,
      flashSaleStart: null,
      flashSaleEnd: null,
    };
  }

  const start = new Date(flashSaleStart);
  const end = new Date(flashSaleEnd);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Offer start and end times must be valid dates");
  }

  if (end <= start) {
    throw new Error("Offer end time must be after the start time");
  }

  if (end <= new Date()) {
    throw new Error("Offer end time must be in the future");
  }

  return {
    salePrice: normalizedSalePrice,
    flashSaleStart: start,
    flashSaleEnd: end,
  };
};

export const createProduct = async (req, res) => {
  try {
    const data = productSchema.parse(req.body);
    const sale = normalizeSaleConfiguration(data);

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
        salePrice: sale.salePrice,
        stock: data.stock,
        deliveryCharge: data.deliveryCharge,
        outsideDistrictExtraCharge: data.outsideDistrictExtraCharge,
        flashSaleStart: sale.flashSaleStart,
        flashSaleEnd: sale.flashSaleEnd,
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
      featured,
      section,
    } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const where = {
      status: "APPROVED",
    };

    if (featured === "true") {
      where.isFeatured = true;
    }

    const sectionNames = ["flash-sale", "best-selling", "featured", "new-arrivals"];
    if (section && !sectionNames.includes(section)) {
      return res.status(400).json({ success: false, message: "Invalid product section" });
    }

    if (section === "flash-sale") {
      const now = new Date();
      where.salePrice = { not: null };
      where.AND = [
        { OR: [{ flashSaleStart: null }, { flashSaleStart: { lte: now } }] },
        { OR: [{ flashSaleEnd: null }, { flashSaleEnd: { gt: now } }] },
      ];
    }

    if (section === "best-selling") where.reviews = { some: {} };
    if (section === "featured") where.isFeatured = true;

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
      const selectedCategory = await prisma.category.findUnique({
        where: { slug: category },
        select: { id: true },
      });

      if (selectedCategory) {
        const allCategories = await prisma.category.findMany({
          select: { id: true, parentId: true },
        });
        const descendants = [selectedCategory.id];
        for (let index = 0; index < descendants.length; index += 1) {
          descendants.push(
            ...allCategories
              .filter((item) => item.parentId === descendants[index])
              .map((item) => item.id)
          );
        }
        where.categoryId = { in: descendants };
      } else {
        where.categoryId = "__category_not_found__";
      }
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

    if (section === "best-selling") orderBy = { reviews: { _count: "desc" } };
    if (section === "new-arrivals") orderBy = { createdAt: "desc" };

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
          reviews: {
            select: { rating: true },
          },
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
      products: products.map((product) => ({
        ...product,
        isFlashSaleActive:
          product.salePrice !== null &&
          (!product.flashSaleStart || product.flashSaleStart <= new Date()) &&
          (!product.flashSaleEnd || product.flashSaleEnd > new Date()),
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getFeaturedProductManagement = async (req, res) => {
  try {
    const { search = "", categoryId = "", featured = "ALL", page = 1, limit = 20 } = req.query;
    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const where = { status: "APPROVED" };
    if (featured === "FEATURED") where.isFeatured = true;
    if (featured === "NOT_FEATURED") where.isFeatured = false;
    if (search.trim()) where.OR = [
      { name: { contains: search.trim(), mode: "insensitive" } },
      { vendor: { user: { username: { contains: search.trim(), mode: "insensitive" } } } },
    ];
    if (categoryId) {
      const categories = await prisma.category.findMany({ select: { id: true, parentId: true } });
      const categoryIds = [], queue = [categoryId], visited = new Set();
      while (queue.length) {
        const currentId = queue.shift();
        if (!currentId || visited.has(currentId)) continue;
        visited.add(currentId); categoryIds.push(currentId);
        categories.filter((category) => category.parentId === currentId).forEach((category) => queue.push(category.id));
      }
      where.categoryId = { in: categoryIds };
    }
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true, images: true, vendor: { select: { id: true, shopName: true, shopSlug: true, user: { select: { username: true } } } } },
        orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
        skip: (pageNumber - 1) * limitNumber,
        take: limitNumber,
      }),
      prisma.product.count({ where }),
    ]);
    return res.json({ success: true, products, pagination: { total, page: pageNumber, limit: limitNumber, totalPages: Math.max(Math.ceil(total / limitNumber), 1) } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to load featured products" });
  }
};

export const updateFeaturedProduct = async (req, res) => {
  try {
    const { isFeatured } = req.body;
    if (typeof isFeatured !== "boolean") return res.status(400).json({ success: false, message: "isFeatured must be true or false" });
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    if (product.status !== "APPROVED") return res.status(400).json({ success: false, message: "Only approved products can be featured" });
    const updatedProduct = await prisma.product.update({ where: { id: product.id }, data: { isFeatured } });
    return res.json({ success: true, message: isFeatured ? "Product added to Featured Products" : "Product removed from Featured Products", product: updatedProduct });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to update featured product" });
  }
};
export const getRelatedProductsBySlug = async (req, res) => {
  try {
    const currentProduct = await prisma.product.findUnique({
      where: { slug: req.params.slug },
      select: {
        id: true,
        categoryId: true,
        status: true,
      },
    });

    if (!currentProduct || currentProduct.status !== "APPROVED") {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (!currentProduct.categoryId) {
      return res.json({
        success: true,
        products: [],
      });
    }

    const products = await prisma.product.findMany({
      where: {
        status: "APPROVED",
        categoryId: currentProduct.categoryId,
        id: { not: currentProduct.id },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        price: true,
        salePrice: true,
        images: {
          orderBy: [
            { isMain: "desc" },
            { id: "asc" },
          ],
          take: 1,
          select: {
            url: true,
            isMain: true,
          },
        },
        reviews: {
          select: {
            rating: true,
          },
        },

      },
      orderBy: { createdAt: "desc" },
      take: 12,
    });

    return res.json({
      success: true,
      products,
    });
  } catch (error) {
    return res.status(500).json({
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

//     const isAdmin = ["SUPPORT_AGENT", "ADMIN", "SUPER_ADMIN"].includes(req.user.role);

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
    const sale = normalizeSaleConfiguration(req.body);

    const data = {
      name: req.body.name,
      description: req.body.description,
      price: Number(req.body.price),

      salePrice: sale.salePrice,

      flashSaleStart: sale.flashSaleStart,
      flashSaleEnd: sale.flashSaleEnd,

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
        orderItems: {
          where: {
            order: {
              orderStatus: { in: ["DELIVERED", "COMPLETED"] },
            },
          },
          select: { quantity: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const productsWithSaleCount = products.map(({ orderItems, ...product }) => ({
      ...product,
      saleCount: orderItems.reduce(
        (total, item) => total + Number(item.quantity || 0),
        0
      ),
    }));

    res.json({
      success: true,
      products: productsWithSaleCount,
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
    const isAdmin = ["SUPPORT_AGENT", "ADMIN", "SUPER_ADMIN"].includes(req.user.role);

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

    const productIds = products.map((product) => product.id);
    const soldQuantities = productIds.length
      ? await prisma.orderItem.groupBy({
          by: ["productId"],
          where: {
            productId: { in: productIds },
            order: {
              orderStatus: { in: ["DELIVERED", "COMPLETED"] },
            },
          },
          _sum: { quantity: true },
        })
      : [];

    const soldQuantityByProduct = new Map(
      soldQuantities.map((item) => [
        item.productId,
        Number(item._sum.quantity || 0),
      ])
    );

    const productsWithTotalSale = products.map((product) => ({
      ...product,
      totalSale: soldQuantityByProduct.get(product.id) || 0,
    }));

    return res.json({
      success: true,
      products: productsWithTotalSale,
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






