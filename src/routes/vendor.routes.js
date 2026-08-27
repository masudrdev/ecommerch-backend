import express from "express";
import {
  registerVendor,
  getMyVendorApplication,
  getMyVendorProfile,
  approveVendor,
  updateVendorStatus,
  getVendorDashboard,
  getVendorSalesChart,
  getAllVendors,
  updateMyVendorProfile,
  requestVendorContactChange,
  verifyVendorContactChange,
} from "../controllers/vendor.controller.js";
import { protect, allowRoles } from "../middlewares/auth.middleware.js";
import { authSensitiveLimiter } from "../middlewares/authRateLimit.middleware.js";
import { uploadVendorLogo } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.get(
  "/application",
  protect,
  allowRoles("CUSTOMER"),
  getMyVendorApplication
);
router.post(
  "/register",
  protect,
  allowRoles("CUSTOMER"),
  uploadVendorLogo,
  registerVendor
);



router.get(
  "/me",
  protect,
  allowRoles("VENDOR"),
  getMyVendorProfile
);
router.patch(
  "/me",
  protect,
  allowRoles("VENDOR"),
  uploadVendorLogo,
  updateMyVendorProfile
);
router.post(
  "/me/contact-change/request",
  protect,
  allowRoles("VENDOR"),
  authSensitiveLimiter,
  requestVendorContactChange
);
router.post(
  "/me/contact-change/verify",
  protect,
  allowRoles("VENDOR"),
  authSensitiveLimiter,
  verifyVendorContactChange
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
