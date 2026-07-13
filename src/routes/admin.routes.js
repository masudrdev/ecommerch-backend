// import express from "express";
// import { getAdminDashboard } from "../controllers/admin.controller.js";

// import { protect, allowRoles } from "../middlewares/auth.middleware.js";

// const router = express.Router();

// router.get(
//   "/dashboard",
//   protect,
//   allowRoles("ADMIN", "SUPER_ADMIN"),
//   getAdminDashboard
// );

// export default router;

import express from "express";

import { getAdminDashboard } from "../controllers/admin.controller.js";
import { reviewProduct } from "../controllers/adminProductReview.controller.js";

import {
  protect,
  allowRoles,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get(
  "/dashboard",
  protect,
  allowRoles("ADMIN", "SUPER_ADMIN"),
  getAdminDashboard
);

router.patch(
  "/products/:id/review",
  protect,
  allowRoles("ADMIN", "SUPER_ADMIN"),
  reviewProduct
);

export default router;