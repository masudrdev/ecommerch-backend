import express from "express";
import {
  createProduct,
  getProducts,
  getAdminProducts,
  getProductBySlug,
  updateProductStatus,
  uploadProductImages,
  addProductVariants,
  updateProduct,
  deleteProduct,
  getMyVendorProducts,
  getProductForManage,
replaceProductVariants,
deleteProductImage,
} from "../controllers/product.controller.js";
import { protect, allowRoles } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";




const router = express.Router();

router.post("/", protect, allowRoles("VENDOR"), createProduct);

router.get("/", getProducts);
router.get(
  "/admin/all",
  protect,
  allowRoles("ADMIN", "SUPER_ADMIN"),
  getAdminProducts
);
router.get("/vendor/my-products", protect, allowRoles("VENDOR"), getMyVendorProducts);
router.get(
  "/manage/:id",
  protect,
  allowRoles("VENDOR", "ADMIN", "SUPER_ADMIN"),
  getProductForManage
);

router.put(
  "/:id/variants",
  protect,
  allowRoles("VENDOR","admin", "SUPER_ADMIN"),
  replaceProductVariants
);

router.delete(
  "/images/:imageId",
  protect,
  allowRoles("VENDOR"),
  deleteProductImage
);

router.get("/:slug", getProductBySlug);
router.patch("/:id/status", protect, allowRoles("ADMIN", "SUPER_ADMIN"), updateProductStatus);
router.patch("/:id", protect, allowRoles("VENDOR", "ADMIN", "SUPER_ADMIN"), updateProduct);
router.delete("/:id", protect, allowRoles("VENDOR"), deleteProduct);
router.post("/:id/images", protect, allowRoles("VENDOR"), upload.array("images", 5), uploadProductImages);
router.post("/:id/variants", protect, allowRoles("VENDOR"), addProductVariants);



export default router;