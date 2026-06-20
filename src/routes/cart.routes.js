import express from "express";
import {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from "../controllers/cart.controller.js";
import { protect, allowRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", protect, allowRoles("CUSTOMER"), addToCart);
router.get("/", protect, allowRoles("CUSTOMER"), getCart);
router.patch("/:itemId", protect, allowRoles("CUSTOMER"), updateCartItem);
router.delete("/:itemId", protect, allowRoles("CUSTOMER"), removeCartItem);
router.delete("/", protect, allowRoles("CUSTOMER"), clearCart);

export default router;