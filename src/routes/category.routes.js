import express from "express";
import {
  createCategory,
  getCategories,
  updateCategoryName,
} from "../controllers/category.controller.js";
import { protect, allowRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  allowRoles("ADMIN", "SUPER_ADMIN"),
  createCategory
);

router.get("/", getCategories);
router.patch(
  "/:id",
  protect,
  allowRoles("ADMIN", "SUPER_ADMIN"),
  updateCategoryName
);

export default router;
