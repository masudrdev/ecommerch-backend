import prisma from "../lib/prisma.js";
import uploadToCloudinary from "../utils/uploadToCloudinary.js";
import deleteFromCloudinary from "../utils/deleteFromCloudinary.js";
import { siteSettingsSchema } from "../validations/siteSettings.validation.js";

const fallback = {
  fullLogoUrl: "/friendbazar-logo.png",
  compactLogoUrl: "/friendbazar-logo.png",
  faviconUrl: "/friendbazar-logo.png",
  phone: "Customer support",
  supportEmail: "support@friendbazar.com",
  location: "Bangladesh",
};
const publicSelect = Object.fromEntries(Object.keys(fallback).map((key) => [key, true]));
const adminSelect = { ...publicSelect, fullLogoPublicId: true, compactLogoPublicId: true, faviconPublicId: true };

const withFallback = (settings) => Object.fromEntries(
  Object.entries(fallback).map(([key, value]) => [key, settings?.[key] || value])
);
const isRealImage = (file) => {
  const bytes = file?.buffer;
  if (!bytes || bytes.length < 12) return false;
  if (file.mimetype === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.mimetype === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (file.mimetype === "image/webp") return bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
  return false;
};

export const getPublicSiteSettings = async (_req, res) => {
  try {
    const settings = await prisma.platformSetting.findUnique({ where: { id: "GLOBAL" }, select: publicSelect });
    return res.json({ success: true, settings: withFallback(settings) });
  } catch {
    return res.json({ success: true, settings: fallback });
  }
};

export const getAdminSiteSettings = async (_req, res) => {
  try {
    const settings = await prisma.platformSetting.findUnique({ where: { id: "GLOBAL" }, select: adminSelect });
    return res.json({ success: true, settings: { ...settings, ...withFallback(settings) } });
  } catch {
    return res.status(500).json({ success: false, message: "Unable to load Site Settings" });
  }
};

export const updateSiteSettings = async (req, res) => {
  const uploaded = {};
  try {
    const data = siteSettingsSchema.parse(req.body);
    const files = {
      fullLogo: req.files?.fullLogo?.[0],
      compactLogo: req.files?.compactLogo?.[0],
      favicon: req.files?.favicon?.[0],
    };
    for (const [key, file] of Object.entries(files)) {
      if (file && !isRealImage(file)) return res.status(400).json({ success: false, message: `${key} must be a valid JPG, PNG, or WebP image` });
    }
    const existing = await prisma.platformSetting.findUnique({ where: { id: "GLOBAL" }, select: adminSelect });
    for (const [key, file] of Object.entries(files)) {
      if (file) uploaded[key] = await uploadToCloudinary(file.buffer, "friendbazar/site-branding");
    }
    const imageData = {};
    for (const [key, value] of Object.entries(uploaded)) {
      imageData[`${key}Url`] = value.secure_url;
      imageData[`${key}PublicId`] = value.public_id;
    }
    const settings = await prisma.platformSetting.upsert({
      where: { id: "GLOBAL" }, update: { ...data, ...imageData }, create: { id: "GLOBAL", ...data, ...imageData }, select: adminSelect,
    });
    for (const key of Object.keys(uploaded)) {
      const oldId = existing?.[`${key}PublicId`];
      if (oldId) await deleteFromCloudinary(oldId).catch(() => null);
    }
    return res.json({ success: true, message: "Site Settings updated successfully", settings: { ...settings, ...withFallback(settings) } });
  } catch (error) {
    await Promise.all(Object.values(uploaded).map((item) => deleteFromCloudinary(item.public_id).catch(() => null)));
    if (error?.name === "ZodError") return res.status(400).json({ success: false, message: error.issues?.[0]?.message || "Invalid Site Settings" });
    if (process.env.NODE_ENV !== "production") console.error("Update Site Settings failed:", error?.message);
    return res.status(500).json({ success: false, message: "Unable to update Site Settings" });
  }
};

