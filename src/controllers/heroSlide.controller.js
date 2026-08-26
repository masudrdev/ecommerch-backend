import prisma from "../lib/prisma.js";
import uploadToCloudinary from "../utils/uploadToCloudinary.js";
import deleteFromCloudinary from "../utils/deleteFromCloudinary.js";
import {
  heroSlideSchema,
  heroSliderSettingSchema,
} from "../validations/heroSlide.validation.js";

const publicSlideSelect = {
  id: true,
  imageUrl: true,
  primaryButtonText: true,
  primaryButtonUrl: true,
  secondaryButtonText: true,
  secondaryButtonUrl: true,
  displayOrder: true,
};

const adminSlideSelect = {
  ...publicSlideSelect,
  imagePublicId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

const isRealImage = (file) => {
  const bytes = file?.buffer;
  if (!bytes || bytes.length < 12) return false;
  if (file.mimetype === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (file.mimetype === "image/png") {
    return bytes.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    );
  }
  if (file.mimetype === "image/webp") {
    return bytes.subarray(0, 4).toString() === "RIFF" &&
      bytes.subarray(8, 12).toString() === "WEBP";
  }
  return false;
};

const cleanSlideData = (data) => ({
  title: null,
  subtitle: null,
  primaryButtonText: data.primaryButtonText,
  primaryButtonUrl: data.primaryButtonUrl,
  secondaryButtonText: data.secondaryButtonText || null,
  secondaryButtonUrl: data.secondaryButtonUrl || null,
  isActive: data.isActive,
  displayOrder: data.displayOrder,
});

const validationMessage = (error) =>
  error?.issues?.[0]?.message || "Invalid Hero slide information";

export const getPublicHeroSlides = async (_req, res) => {
  try {
    const [slides, settings] = await Promise.all([
      prisma.heroSlide.findMany({
        where: { isActive: true },
        select: publicSlideSelect,
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      }),
      prisma.platformSetting.findUnique({
        where: { id: "GLOBAL" },
        select: { heroAutoSlide: true, heroIntervalMs: true },
      }),
    ]);

    return res.json({
      success: true,
      slides,
      settings: {
        autoSlide: settings?.heroAutoSlide ?? true,
        intervalMs: settings?.heroIntervalMs ?? 5000,
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Unable to load Hero slides",
    });
  }
};

export const getAdminHeroSlides = async (_req, res) => {
  try {
    const [slides, settings] = await Promise.all([
      prisma.heroSlide.findMany({
        select: adminSlideSelect,
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      }),
      prisma.platformSetting.findUnique({ where: { id: "GLOBAL" } }),
    ]);

    return res.json({
      success: true,
      slides,
      settings: {
        heroAutoSlide: settings?.heroAutoSlide ?? true,
        heroIntervalMs: settings?.heroIntervalMs ?? 5000,
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Unable to load Hero Settings",
    });
  }
};

export const createHeroSlide = async (req, res) => {
  try {
    const data = heroSlideSchema.parse(req.body);
    if (!req.file || !isRealImage(req.file)) {
      return res.status(400).json({
        success: false,
        message: "A valid JPG, PNG, or WebP Hero image is required",
      });
    }

    const uploaded = await uploadToCloudinary(
      req.file.buffer,
      "friendbazar/hero-slides"
    );

    try {
      const slide = await prisma.heroSlide.create({
        data: {
          ...cleanSlideData(data),
          imageUrl: uploaded.secure_url,
          imagePublicId: uploaded.public_id,
        },
        select: adminSlideSelect,
      });
      return res.status(201).json({
        success: true,
        message: "Hero slide created successfully",
        slide,
      });
    } catch (error) {
      await deleteFromCloudinary(uploaded.public_id).catch(() => null);
      throw error;
    }
  } catch (error) {
    if (error?.name === "ZodError") {
      return res.status(400).json({ success: false, message: validationMessage(error) });
    }
    if (process.env.NODE_ENV !== "production") {
      console.error("Create Hero slide failed:", error?.message);
    }
    return res.status(500).json({ success: false, message: "Unable to create Hero slide" });
  }
};

export const updateHeroSlide = async (req, res) => {
  try {
    const data = heroSlideSchema.parse(req.body);
    const existing = await prisma.heroSlide.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Hero slide not found" });
    }

    let uploaded = null;
    if (req.file) {
      if (!isRealImage(req.file)) {
        return res.status(400).json({
          success: false,
          message: "Please upload a valid JPG, PNG, or WebP image",
        });
      }
      uploaded = await uploadToCloudinary(
        req.file.buffer,
        "friendbazar/hero-slides"
      );
    }

    try {
      const slide = await prisma.heroSlide.update({
        where: { id: existing.id },
        data: {
          ...cleanSlideData(data),
          ...(uploaded
            ? { imageUrl: uploaded.secure_url, imagePublicId: uploaded.public_id }
            : {}),
        },
        select: adminSlideSelect,
      });

      if (uploaded && existing.imagePublicId) {
        await deleteFromCloudinary(existing.imagePublicId).catch(() => null);
      }
      return res.json({
        success: true,
        message: "Hero slide updated successfully",
        slide,
      });
    } catch (error) {
      if (uploaded?.public_id) {
        await deleteFromCloudinary(uploaded.public_id).catch(() => null);
      }
      throw error;
    }
  } catch (error) {
    if (error?.name === "ZodError") {
      return res.status(400).json({ success: false, message: validationMessage(error) });
    }
    if (process.env.NODE_ENV !== "production") {
      console.error("Update Hero slide failed:", error?.message);
    }
    return res.status(500).json({ success: false, message: "Unable to update Hero slide" });
  }
};

export const deleteHeroSlide = async (req, res) => {
  try {
    const existing = await prisma.heroSlide.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Hero slide not found" });
    }

    await prisma.heroSlide.delete({ where: { id: existing.id } });
    if (existing.imagePublicId) {
      await deleteFromCloudinary(existing.imagePublicId).catch(() => null);
    }
    return res.json({ success: true, message: "Hero slide deleted successfully" });
  } catch {
    return res.status(500).json({ success: false, message: "Unable to delete Hero slide" });
  }
};

export const updateHeroSliderSettings = async (req, res) => {
  try {
    const data = heroSliderSettingSchema.parse(req.body);
    const settings = await prisma.platformSetting.upsert({
      where: { id: "GLOBAL" },
      update: data,
      create: { id: "GLOBAL", ...data },
      select: { heroAutoSlide: true, heroIntervalMs: true },
    });
    return res.json({
      success: true,
      message: "Hero slider settings updated",
      settings,
    });
  } catch (error) {
    if (error?.name === "ZodError") {
      return res.status(400).json({ success: false, message: validationMessage(error) });
    }
    return res.status(500).json({ success: false, message: "Unable to update Hero slider settings" });
  }
};