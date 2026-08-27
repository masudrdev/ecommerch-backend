import { z } from "zod";
import { registerSchema } from "./auth.validation.js";
import { vendorRegisterSchema } from "./vendor.validation.js";

export const managedUserSchema = registerSchema.extend({
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  confirmPassword: z.string().min(6),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const managedVendorSchema = managedUserSchema.and(
  vendorRegisterSchema.extend({
    officeDistrict: z.string().trim().max(120).optional().or(z.literal("")),
    officeUpazila: z.string().trim().max(120).optional().or(z.literal("")),
    officeVillage: z.string().trim().max(120).optional().or(z.literal("")),
  })
);
