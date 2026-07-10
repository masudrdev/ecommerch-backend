import prisma from "../lib/prisma.js";
import { brandSchema } from "../validations/brand.validation.js";
import cloudinary from "../config/cloudinary.js";

const makeSlug = (text) => {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");
};

const uploadBufferToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "friendbazar/brands",
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );

    stream.end(fileBuffer);
  });
};

export const createBrand = async (req, res) => {
  try {
    let logoUrl = req.body.logo || "";

    if (req.file) {
      logoUrl = await uploadBufferToCloudinary(req.file.buffer);
    }

    const body = {
      name: req.body.name,
      slug: req.body.slug || makeSlug(req.body.name),
      logo: logoUrl || "",
    };

    const data = brandSchema.parse(body);

    const exists = await prisma.brand.findUnique({
      where: {
        slug: data.slug,
      },
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Brand slug already exists",
      });
    }

    const brand = await prisma.brand.create({
      data: {
        name: data.name,
        slug: data.slug,
        logo: data.logo || "",
      },
    });

    res.status(201).json({
      success: true,
      message: "Brand created successfully",
      brand,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getBrands = async (req, res) => {
  try {
    const brands = await prisma.brand.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      brands,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getBrandById = async (req, res) => {
  try {
    const { id } = req.params;

    const brand = await prisma.brand.findUnique({
      where: {
        id,
      },
    });

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    res.json({
      success: true,
      brand,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateBrand = async (req, res) => {
  try {
    const { id } = req.params;

    const oldBrand = await prisma.brand.findUnique({
      where: {
        id,
      },
    });

    if (!oldBrand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    let logoUrl = req.body.logo ?? oldBrand.logo ?? "";

    if (req.file) {
      logoUrl = await uploadBufferToCloudinary(req.file.buffer);
    }

    const body = {
      name: req.body.name || oldBrand.name,
      slug: req.body.slug || oldBrand.slug,
      logo: logoUrl || "",
    };

    const data = brandSchema.parse(body);

    const slugExists = await prisma.brand.findFirst({
      where: {
        slug: data.slug,
        NOT: {
          id,
        },
      },
    });

    if (slugExists) {
      return res.status(400).json({
        success: false,
        message: "Brand slug already exists",
      });
    }

    const brand = await prisma.brand.update({
      where: {
        id,
      },
      data: {
        name: data.name,
        slug: data.slug,
        logo: data.logo || "",
      },
    });

    res.json({
      success: true,
      message: "Brand updated successfully",
      brand,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;

    const brand = await prisma.brand.findUnique({
      where: {
        id,
      },
    });

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    await prisma.brand.delete({
      where: {
        id,
      },
    });

    res.json({
      success: true,
      message: "Brand deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};