import express from "express";
import { getPublicPageContent, getPageSettings, updatePageSetting } from "../controllers/pageSettings.controller.js";
import { protect, allowRoles } from "../middlewares/auth.middleware.js";
const router = express.Router();
router.get("/public/:key", getPublicPageContent);
router.get("/admin", protect, allowRoles("SUPER_ADMIN"), getPageSettings);
router.put("/admin/:key", protect, allowRoles("SUPER_ADMIN"), updatePageSetting);
export default router;