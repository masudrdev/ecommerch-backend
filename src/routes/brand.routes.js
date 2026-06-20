import express from "express";
import { createBrand, getBrands } from "../controllers/brand.controller.js";
import { protect, allowRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  allowRoles("ADMIN", "SUPER_ADMIN"),
  createBrand
);

router.get("/", getBrands);

export default router;