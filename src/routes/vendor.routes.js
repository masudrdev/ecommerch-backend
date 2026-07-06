import express from "express";
import {
  registerVendor,
  getMyVendorProfile,
  approveVendor,
  updateVendorStatus,
  getVendorDashboard,
  getVendorSalesChart,
  getAllVendors,
} from "../controllers/vendor.controller.js";
import { protect, allowRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post(
  "/register",
  protect,
  allowRoles("VENDOR"),
  registerVendor
);


router.get(
  "/me",
  protect,
  allowRoles("VENDOR"),
  getMyVendorProfile
);
router.get(
  "/",
  protect,
  allowRoles("ADMIN", "SUPER_ADMIN"),
  getAllVendors
);

router.get(
  "/dashboard",
  protect,
  allowRoles("VENDOR"),
  getVendorDashboard
);
router.get(
  "/dashboard/sales-chart",
  protect,
  allowRoles("VENDOR"),
  getVendorSalesChart
);

router.patch(
  "/:id/approve",
  protect,
  allowRoles("ADMIN", "SUPER_ADMIN"),
  approveVendor
);

router.patch(
  "/:id/status",
  protect,
  allowRoles("ADMIN", "SUPER_ADMIN"),
  updateVendorStatus
);

export default router;