import express from "express";

import {
  getVendorEarnings,
  getRevenue,
  getCommission,
  getPayoutReports,
} from "../controllers/finance.controller.js";

import {
  protect,
  allowRoles,
} from "../middlewares/auth.middleware.js";


const router = express.Router();


router.get(
  "/vendor-earnings",
  protect,
  allowRoles("SUPER_ADMIN"),
  getVendorEarnings
);
router.get(
  "/revenue",
  protect,
  allowRoles("SUPER_ADMIN"),
  getRevenue
);
router.get(
 "/commission",
 protect,
 allowRoles("SUPER_ADMIN"),
 getCommission
);
router.get(
  "/payout-reports",
  protect,
  allowRoles("SUPER_ADMIN"),
  getPayoutReports
);


export default router;