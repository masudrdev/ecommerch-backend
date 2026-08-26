import express from "express";
import {
  createHeroSlide,
  deleteHeroSlide,
  getAdminHeroSlides,
  getPublicHeroSlides,
  updateHeroSlide,
  updateHeroSliderSettings,
} from "../controllers/heroSlide.controller.js";
import { protect, allowRoles } from "../middlewares/auth.middleware.js";
import { uploadHeroImage } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.get("/public", getPublicHeroSlides);
router.get("/admin", protect, allowRoles("SUPER_ADMIN"), getAdminHeroSlides);
router.post("/admin", protect, allowRoles("SUPER_ADMIN"), uploadHeroImage, createHeroSlide);
router.patch("/admin/settings", protect, allowRoles("SUPER_ADMIN"), updateHeroSliderSettings);
router.patch("/admin/:id", protect, allowRoles("SUPER_ADMIN"), uploadHeroImage, updateHeroSlide);
router.delete("/admin/:id", protect, allowRoles("SUPER_ADMIN"), deleteHeroSlide);

export default router;