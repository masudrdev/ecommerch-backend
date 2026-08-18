import express from "express";
import { getActivityLogById, getActivityLogs } from "../controllers/activityLog.controller.js";
import { protect, allowRoles } from "../middlewares/auth.middleware.js";
const router = express.Router();
router.use(protect, allowRoles("SUPER_ADMIN"));
router.get("/", getActivityLogs);
router.get("/:id", getActivityLogById);
export default router;
