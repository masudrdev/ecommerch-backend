import express from "express";
import { getAdminSiteSettings, getPublicSiteSettings, updateSiteSettings } from "../controllers/siteSettings.controller.js";
import { protect, allowRoles } from "../middlewares/auth.middleware.js";
import { uploadSiteBranding } from "../middlewares/upload.middleware.js";

const router = express.Router();
router.get("/public", getPublicSiteSettings);
router.get("/admin", protect, allowRoles("SUPER_ADMIN"), getAdminSiteSettings);
router.patch("/admin", protect, allowRoles("SUPER_ADMIN"), uploadSiteBranding, updateSiteSettings);
export default router;
