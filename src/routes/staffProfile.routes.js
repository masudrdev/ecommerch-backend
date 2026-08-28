import express from "express";
import { protect, allowRoles } from "../middlewares/auth.middleware.js";
import { authSensitiveLimiter } from "../middlewares/authRateLimit.middleware.js";
import { uploadStaffAvatar } from "../middlewares/upload.middleware.js";
import {
  getMyStaffProfile,
  updateMyStaffProfile,
  requestStaffContactChange,
  verifyStaffContactChange,
  updateStaffContact,
} from "../controllers/staffProfile.controller.js";

const router = express.Router();
const staffOnly = allowRoles("SUPER_ADMIN", "ADMIN", "SUPPORT_AGENT");

router.get("/me", protect, staffOnly, getMyStaffProfile);
router.patch("/me", protect, staffOnly, uploadStaffAvatar, updateMyStaffProfile);
router.post("/me/contact-change/request", protect, staffOnly, authSensitiveLimiter, requestStaffContactChange);
router.post("/me/contact-change/verify", protect, staffOnly, authSensitiveLimiter, verifyStaffContactChange);
router.patch("/me/contact-change", protect, staffOnly, authSensitiveLimiter, updateStaffContact);

export default router;