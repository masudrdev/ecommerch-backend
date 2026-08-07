import express from "express";
import {
  createBrand,
  getBrands,
  updateBrand,
  deleteBrand,
} from "../controllers/brand.controller.js";

import { protect, allowRoles } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.get("/", getBrands);

router.post(
  "/",
  protect,
  allowRoles("ADMIN", "SUPER_ADMIN"),
  upload.single("logoFile"),
  createBrand
);

router.put(
  "/:id",
  protect,
  allowRoles("ADMIN", "SUPER_ADMIN"),
  upload.single("logoFile"),
  updateBrand
);

router.delete(
  "/:id",
  protect,
  allowRoles("ADMIN", "SUPER_ADMIN"),
  deleteBrand
);

export default router;