import { z } from "zod";

export const brandSchema = z.object({
  name: z.string().min(2, "Brand name is required"),
  slug: z.string().min(2, "Slug is required"),
  logo: z.string().optional(),
});