import express from "express";
import {
  requestPayout,
  getMyPayoutRequests,
  getAllPayoutRequests,
  updatePayoutStatus,
} from "../controllers/payout.controller.js";
import { protect, allowRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/request", protect, allowRoles("VENDOR"), requestPayout);
router.get("/my-requests", protect, allowRoles("VENDOR"), getMyPayoutRequests);

router.get(
  "/admin/all",
  protect,
  allowRoles("ADMIN", "SUPER_ADMIN"),
  getAllPayoutRequests
);

router.patch(
  "/:id/status",
  protect,
  allowRoles("SUPER_ADMIN"),
  updatePayoutStatus
);

export default router;