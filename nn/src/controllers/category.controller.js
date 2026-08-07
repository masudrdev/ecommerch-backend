import prisma from "../lib/prisma.js";
import { categorySchema } from "../validations/category.validation.js";

const makeSlug = (text) => {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");
};

export const createCategory = async (req, res) => {
  try {
    const body = {
      ...req.body,
      slug: req.body.slug || makeSlug(req.body.name),
      parentId: req.body.parentId || "",
      image: req.body.image || "",
    };

    const data = categorySchema.parse(body);

    const parentId =
      data.parentId && data.parentId.trim() !== "" ? data.parentId : null;

    const exists = await prisma.category.findUnique({
      where: { slug: data.slug },
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Category slug already exists",
      });
    }

    if (parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: parentId },
      });

      if (!parent) {
        return res.status(404).json({
          success: false,
          message: "Parent category not found",
        });
      }
    }

    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug: data.slug,
        image: data.image || "",
        parentId,
      },
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
    const allCategories = await prisma.category.findMany({
      orderBy: { createdAt: "desc" },
    });

    const map = {};
    const roots = [];

    allCategories.forEach((category) => {
      map[category.id] = {
        ...category,
        children: [],
      };
    });

    allCategories.forEach((category) => {
      if (category.parentId && map[category.parentId]) {
        map[category.parentId].children.push(map[category.id]);
      } else {
        roots.push(map[category.id]);
      }
    });

    res.json({
      success: true,
      categories: roots,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};