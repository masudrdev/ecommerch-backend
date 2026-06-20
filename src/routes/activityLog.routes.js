import express from "express";
import { getActivityLogs } from "../controllers/activityLog.controller.js";
import { protect, allowRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get(
  "/",
  protect,
  allowRoles("ADMIN", "SUPER_ADMIN"),
  getActivityLogs
);

export default router;