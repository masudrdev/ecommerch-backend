import express from "express";

import {
  createTicket,
  getMyTickets,
  getAllTickets,
  getTicketDetails,
  replyTicket,
  addInternalNote,
  assignTicket,
  unassignTicket,
  escalateTicket,
  updateTicketPriority,
  updateTicketStatus,
  closeMyTicket,
  reopenMyTicket,
  rateTicket,
  archiveTicket,
  getSupportStaff,
  getAdminUsers,
  getSupportDashboardStats,
} from "../controllers/support.controller.js";

import {
  protect,
  allowRoles,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

const customerVendorRoles = allowRoles("CUSTOMER", "VENDOR");

const supportStaffRoles = allowRoles(
  "SUPPORT_AGENT",
  "ADMIN",
  "SUPER_ADMIN"
);

const adminRoles = allowRoles("ADMIN", "SUPER_ADMIN");

/*
|--------------------------------------------------------------------------
| Customer and Vendor routes
|--------------------------------------------------------------------------
*/

router.post(
  "/tickets",
  protect,
  customerVendorRoles,
  createTicket
);

router.get(
  "/my-tickets",
  protect,
  customerVendorRoles,
  getMyTickets
);

router.patch(
  "/tickets/:id/close",
  protect,
  customerVendorRoles,
  closeMyTicket
);

router.patch(
  "/tickets/:id/reopen",
  protect,
  customerVendorRoles,
  reopenMyTicket
);

router.patch(
  "/tickets/:id/rating",
  protect,
  customerVendorRoles,
  rateTicket
);

/*
|--------------------------------------------------------------------------
| Shared ticket routes
|--------------------------------------------------------------------------
*/

router.get(
  "/tickets/:id",
  protect,
  getTicketDetails
);

router.post(
  "/tickets/:id/reply",
  protect,
  replyTicket
);

/*
|--------------------------------------------------------------------------
| Support Agent, Admin and Super Admin routes
|--------------------------------------------------------------------------
*/

router.get(
  "/staff/dashboard",
  protect,
  supportStaffRoles,
  getSupportDashboardStats
);

router.get(
  "/staff/tickets",
  protect,
  supportStaffRoles,
  getAllTickets
);

router.get(
  "/staff/users",
  protect,
  supportStaffRoles,
  getSupportStaff
);

router.get(
  "/staff/admin-users",
  protect,
  supportStaffRoles,
  getAdminUsers
);

router.post(
  "/tickets/:id/internal-note",
  protect,
  supportStaffRoles,
  addInternalNote
);

router.patch(
  "/tickets/:id/assign",
  protect,
  supportStaffRoles,
  assignTicket
);

router.patch(
  "/tickets/:id/escalate",
  protect,
  supportStaffRoles,
  escalateTicket
);

router.patch(
  "/tickets/:id/priority",
  protect,
  supportStaffRoles,
  updateTicketPriority
);

router.patch(
  "/tickets/:id/status",
  protect,
  supportStaffRoles,
  updateTicketStatus
);

/*
|--------------------------------------------------------------------------
| Admin and Super Admin only routes
|--------------------------------------------------------------------------
*/

router.patch(
  "/tickets/:id/unassign",
  protect,
  adminRoles,
  unassignTicket
); 
  
router.patch(
  "/tickets/:id/archive",
  protect,
  adminRoles,
  archiveTicket
);

/*
|--------------------------------------------------------------------------
| Old route compatibility
|--------------------------------------------------------------------------
*/

router.get(
  "/admin/all",
  protect,
  supportStaffRoles,
  getAllTickets
);

export default router;