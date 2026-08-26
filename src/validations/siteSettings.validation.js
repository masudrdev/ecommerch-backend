import { z } from "zod";

export const siteSettingsSchema = z.object({
  phone: z.string().trim().max(40),
  supportEmail: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  location: z.string().trim().max(160),
});
