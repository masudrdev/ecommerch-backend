import prisma from "../lib/prisma.js";
import { brandSchema } from "../validations/brand.validation.js";

export const createBrand = async (req, res) => {
  try {
    const data = brandSchema.parse(req.body);

    const exists = await prisma.brand.findUnique({
      where: { slug: data.slug },
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Brand slug already exists",
      });
    }

    const brand = await prisma.brand.create({ data });

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
      orderBy: { createdAt: "desc" },
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