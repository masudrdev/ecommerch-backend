import { z } from "zod";

export const vendorRegisterSchema = z.object({
  shopName: z.string().trim().min(2, "Shop name is required").max(120),
  shopSlug: z.string().trim().min(2, "Shop slug is required").max(120)
    .regex(/^[a-z0-9-]+$/, "Slug can contain lowercase letters, numbers and hyphen only"),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  officeDistrict: z.string().trim().max(120).optional().or(z.literal("")),
  officeUpazila: z.string().trim().max(120).optional().or(z.literal("")),
  officeVillage: z.string().trim().max(120).optional().or(z.literal("")),
});
