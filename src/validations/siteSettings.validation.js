import { z } from "zod";

const formBoolean = z.preprocess(
  (value) => value === true || value === "true",
  z.boolean()
);

export const siteSettingsSchema = z.object({
  phone: z.string().trim().max(40),
  supportEmail: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  location: z.string().trim().max(160),
  metaTrackingEnabled: formBoolean,
  metaPixelId: z.string().trim().max(30).refine(
    (value) => !value || /^\d{5,30}$/.test(value),
    "Meta Pixel ID must contain only digits"
  ),
  metaCapiAccessToken: z.string().trim().max(5000),
  metaTestEventCode: z.string().trim().max(100),
});