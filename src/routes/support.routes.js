import express from "express";
import {
  createTicket,
  getMyTickets,
  getAllTickets,
  getTicketDetails,
  replyTicket,
  updateTicketStatus,
} from "../controllers/support.controller.js";
import { protect, allowRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post(
  "/tickets",
  protect,
  allowRoles("CUSTOMER", "VENDOR"),
  createTicket
);

router.get(
  "/my-tickets",
  protect,
  allowRoles("CUSTOMER", "VENDOR"),
  getMyTickets
);

router.get(
  "/admin/all",
  protect,
  allowRoles("SUPPORT_AGENT", "ADMIN", "SUPER_ADMIN"),
  getAllTickets
);

router.get("/tickets/:id", protect, getTicketDetails);

router.post("/tickets/:id/reply", protect, replyTicket);

router.patch(
  "/tickets/:id/status",
  protect,
  allowRoles("SUPPORT_AGENT", "ADMIN", "SUPER_ADMIN"),
  updateTicketStatus
);

export default router;