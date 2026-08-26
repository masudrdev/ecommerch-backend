import { z } from "zod";

const safeLink = z.string().trim().min(1).max(500).refine((value) => {
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  if (value.startsWith("#")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}, "CTA link must be a safe internal, http, or https URL");

const optionalText = (max) => z.string().trim().max(max).optional().or(z.literal(""));
const optionalLink = safeLink.optional().or(z.literal(""));

export const heroSlideSchema = z.object({
  primaryButtonText: z.string().trim().min(1).max(60),
  primaryButtonUrl: safeLink,
  secondaryButtonText: optionalText(60),
  secondaryButtonUrl: optionalLink,
  isActive: z.union([z.boolean(), z.enum(["true", "false"])]).transform((value) => value === true || value === "true"),
  displayOrder: z.coerce.number().int().min(0).max(10000),
}).refine(
  (data) => Boolean(data.secondaryButtonText) === Boolean(data.secondaryButtonUrl),
  "Secondary CTA text and link must be provided together"
);

export const heroSliderSettingSchema = z.object({
  heroAutoSlide: z.boolean(),
  heroIntervalMs: z.number().int().min(2000).max(30000),
});