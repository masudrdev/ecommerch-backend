import prisma from "../lib/prisma.js";
import { categorySchema } from "../validations/category.validation.js";

export const createCategory = async (req, res) => {
  try {
    const data = categorySchema.parse(req.body);

    const exists = await prisma.category.findUnique({
      where: { slug: data.slug },
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Category slug already exists",
      });
    }

    const category = await prisma.category.create({
      data,
    });

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            children: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};