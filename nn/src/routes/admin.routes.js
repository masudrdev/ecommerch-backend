import express from "express";

import { getAdminDashboard } from "../controllers/admin.controller.js";

import {
  reviewProduct,
  bulkReviewProducts,
} from "../controllers/adminProductReview.controller.js";

import {
  protect,
  allowRoles,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

/**
 * Admin dashboard
 */
router.get(
  "/dashboard",
  protect,
  allowRoles("ADMIN", "SUPER_ADMIN"),
  getAdminDashboard
);
router.patch(
  "/products/bulk-review",
  protect,
  allowRoles("ADMIN", "SUPER_ADMIN"),
  bulkReviewProducts
);

/**
 * Single product approve/reject
 */
router.patch(
  "/products/:id/review",
  protect,
  allowRoles("ADMIN", "SUPER_ADMIN"),
  reviewProduct
);

export default router;