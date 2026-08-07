import express from "express";
import {
  getCustomerDashboard,
  getSupportDashboard,
} from "../controllers/dashboard.controller.js";
import { protect, allowRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get(
  "/customer",
  protect,
  allowRoles("CUSTOMER"),
  getCustomerDashboard
);

router.get(
  "/support",
  protect,
  allowRoles("SUPPORT_AGENT", "ADMIN", "SUPER_ADMIN"),
  getSupportDashboard
);

export default router;