import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(2, "Category name is required"),
  slug: z.string().min(2, "Slug is required"),
  image: z.string().optional(),
  parentId: z.string().optional(),
});