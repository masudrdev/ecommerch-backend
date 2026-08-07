import express from "express";
import {
  createReview,
  createAdminCustomReview,
  getAdminReviews,
  getMyReviews,
  getProductReviews,
  getVendorReviews,
  getVendorProductReviews,
  replyVendorReview,
  updateReview,
  deleteReview,
} from "../controllers/review.controller.js";
import { protect, allowRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", protect, allowRoles("CUSTOMER"), createReview);

router.get("/my-reviews", protect, allowRoles("CUSTOMER"), getMyReviews);

router.get(
  "/admin/all",
  protect,
  allowRoles("ADMIN", "SUPER_ADMIN"),
  getAdminReviews
);

router.post(
  "/admin/custom",
  protect,
  allowRoles("ADMIN", "SUPER_ADMIN"),
  createAdminCustomReview
);

router.get("/vendor", protect, allowRoles("VENDOR"), getVendorReviews);

router.patch(
  "/vendor/reply/:reviewId",
  protect,
  allowRoles("VENDOR"),
  replyVendorReview
);

router.get(
  "/vendor/:productId",
  protect,
  allowRoles("VENDOR"),
  getVendorProductReviews
);

router.get("/product/:productId", getProductReviews);

router.patch("/:id", protect, allowRoles("CUSTOMER"), updateReview);

router.delete(
  "/:id",
  protect,
  allowRoles("CUSTOMER", "ADMIN", "SUPER_ADMIN"),
  deleteReview
);

export default router;