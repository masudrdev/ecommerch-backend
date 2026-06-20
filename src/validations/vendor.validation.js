import { z } from "zod";

export const vendorRegisterSchema = z.object({
  shopName: z.string().min(2, "Shop name is required"),
  shopSlug: z
    .string()
    .min(2, "Shop slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug can contain lowercase letters, numbers and hyphen only"),
  description: z.string().optional(),
});