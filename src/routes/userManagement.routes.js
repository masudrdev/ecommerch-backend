import express from "express";
import { protect, allowRoles } from "../middlewares/auth.middleware.js";
import { getManagedUsers, updateManagedUserStatus, updateVendorCommission } from "../controllers/userManagement.controller.js";

const router = express.Router();
router.get("/:group", protect, allowRoles("SUPER_ADMIN"), getManagedUsers);
router.patch("/users/:id/status", protect, allowRoles("SUPER_ADMIN"), updateManagedUserStatus);
router.patch("/vendors/:id/commission", protect, allowRoles("SUPER_ADMIN"), updateVendorCommission);
export default router;
