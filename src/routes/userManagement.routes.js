import express from "express";
import { protect, allowRoles } from "../middlewares/auth.middleware.js";
import { uploadVendorLogo } from "../middlewares/upload.middleware.js";
import {
  createManagedAccount,
  getManagedUsers,
  updateManagedUserStatus,
  updateVendorCommission,
  deductVendorBalance,
} from "../controllers/userManagement.controller.js";

const router = express.Router();
router.post("/:group", protect, allowRoles("SUPER_ADMIN"), uploadVendorLogo, createManagedAccount);
router.get("/:group", protect, allowRoles("SUPER_ADMIN"), getManagedUsers);
router.patch("/users/:id/status", protect, allowRoles("SUPER_ADMIN"), updateManagedUserStatus);
router.patch("/vendors/:id/commission", protect, allowRoles("SUPER_ADMIN"), updateVendorCommission);
router.post("/vendors/:id/deduct-balance", protect, allowRoles("SUPER_ADMIN"), deductVendorBalance);
export default router;

