import express from "express";
import { getAdminDashboard } from "../controllers/admin.controller.js";
import { protect, allowRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get(
  "/dashboard",
  protect,
  allowRoles("ADMIN", "SUPER_ADMIN"),
  getAdminDashboard
);

export default router;