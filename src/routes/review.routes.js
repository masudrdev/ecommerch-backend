import express from "express";
import {
  createReview,
  getProductReviews,
  updateReview,
  deleteReview,
} from "../controllers/review.controller.js";
import { protect, allowRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", protect, allowRoles("CUSTOMER"), createReview);

router.get("/product/:productId", getProductReviews);

router.patch("/:id", protect, allowRoles("CUSTOMER"), updateReview);

router.delete(
  "/:id",
  protect,
  allowRoles("CUSTOMER", "ADMIN", "SUPER_ADMIN"),
  deleteReview
);

export default router;