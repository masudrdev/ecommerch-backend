import express from "express";

import {
  requestPayout,
  getMyPayoutSummary,
  getMyPayoutRequests,
  cancelMyPayout,
  getAdminPayoutSummary,
  getAllPayoutRequests,
  approvePayout,
  rejectPayout,
  markPayoutAsPaid,
} from "../controllers/payout.controller.js";

import {
  protect,
  allowRoles,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Vendor Payout Routes
|--------------------------------------------------------------------------
*/

router.get(
  "/summary",
  protect,
  allowRoles("VENDOR"),
  getMyPayoutSummary
);

router.get(
  "/my-requests",
  protect,
  allowRoles("VENDOR"),
  getMyPayoutRequests
);

router.post(
  "/request",
  protect,
  allowRoles("VENDOR"),
  requestPayout
);

router.patch(
  "/:id/cancel",
  protect,
  allowRoles("VENDOR"),
  cancelMyPayout
);

/*
|--------------------------------------------------------------------------
| Admin / Super Admin Routes
|--------------------------------------------------------------------------
*/

router.get(
  "/admin/all",
  protect,
  allowRoles("ADMIN", "SUPER_ADMIN"),
  getAllPayoutRequests
);

/*
|--------------------------------------------------------------------------
| Super Admin Finance Routes
|--------------------------------------------------------------------------
*/

router.get(
  "/admin/summary",
  protect,
  allowRoles("SUPER_ADMIN"),
  getAdminPayoutSummary
);

router.patch(
  "/:id/approve",
  protect,
  allowRoles("SUPER_ADMIN"),
  approvePayout
);

router.patch(
  "/:id/reject",
  protect,
  allowRoles("SUPER_ADMIN"),
  rejectPayout
);

router.patch(
  "/:id/mark-paid",
  protect,
  allowRoles("SUPER_ADMIN"),
  markPayoutAsPaid
);

export default router;