import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(2, "Product name is required"),
  slug: z.string().min(2, "Slug is required"),
  description: z.string().optional(),
  price: z.number().positive("Price must be positive"),
  salePrice: z.number().positive().optional(),
  stock: z.number().int().min(0),
  categoryId: z.string().min(1, "Category is required"),
  brandId: z.string().optional(),
});