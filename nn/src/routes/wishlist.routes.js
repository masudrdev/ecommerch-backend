import express from "express";
import {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
} from "../controllers/wishlist.controller.js";
import { protect, allowRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/:productId", protect, allowRoles("CUSTOMER"), addToWishlist);

router.get("/", protect, allowRoles("CUSTOMER"), getWishlist);

router.delete("/:productId", protect, allowRoles("CUSTOMER"), removeFromWishlist);

export default router;