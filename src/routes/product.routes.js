import express from "express";
import {
  createProduct,
  getProducts,
  getProductBySlug,
  updateProductStatus,
  uploadProductImages,
  addProductVariants,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller.js";
import { protect, allowRoles } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";




const router = express.Router();

router.post("/", protect, allowRoles("VENDOR"), createProduct);

router.get("/", getProducts);
router.patch("/:id/status", protect, allowRoles("ADMIN", "SUPER_ADMIN"), updateProductStatus);
router.patch("/:id", protect, allowRoles("VENDOR"), updateProduct);
router.delete("/:id", protect, allowRoles("VENDOR"), deleteProduct);
router.post("/:id/images", protect, allowRoles("VENDOR"), upload.array("images", 5), uploadProductImages);
router.post("/:id/variants", protect, allowRoles("VENDOR"), addProductVariants);


router.get("/:slug", getProductBySlug);
export default router;