import express from "express";
import {
  getMyAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} from "../controllers/address.controller.js";
import { protect, allowRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", protect, allowRoles("CUSTOMER"), getMyAddresses);

router.post("/", protect, allowRoles("CUSTOMER"), createAddress);

router.patch("/:id", protect, allowRoles("CUSTOMER"), updateAddress);

router.delete("/:id", protect, allowRoles("CUSTOMER"), deleteAddress);

export default router;