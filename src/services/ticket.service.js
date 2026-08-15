import axiosInstance from "@/lib/axiosInstance";

/*
|--------------------------------------------------------------------------
| Query parameter helper
|--------------------------------------------------------------------------
*/

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      value !== "all"
    ) {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();

  return queryString ? `?${queryString}` : "";
};

/*
|--------------------------------------------------------------------------
| Customer and Vendor APIs
|--------------------------------------------------------------------------
*/

/**
 * Customer or Vendor creates a support ticket.
 */
export const createSupportTicketApi = async (payload) => {
  const response = await axiosInstance.post(
    "/support/tickets",
    payload
  );

  return response.data;
};

/**
 * Get logged-in Customer or Vendor tickets.
 */
export const getMySupportTicketsApi = async (params = {}) => {
  const query = buildQueryString(params);

  const response = await axiosInstance.get(
    `/support/my-tickets${query}`
  );

  return response.data;
};

/**
 * Customer or Vendor closes their resolved ticket.
 */
export const closeMySupportTicketApi = async (ticketId) => {
  if (!ticketId) {
    throw new Error("Ticket ID is required");
  }

  const response = await axiosInstance.patch(
    `/support/tickets/${ticketId}/close`
  );

  return response.data;
};

/**
 * Customer or Vendor reopens a resolved or closed ticket.
 */
export const reopenMySupportTicketApi = async (
  ticketId,
  reason = ""
) => {
  if (!ticketId) {
    throw new Error("Ticket ID is required");
  }

  const response = await axiosInstance.patch(
    `/support/tickets/${ticketId}/reopen`,
    {
      reason,
    }
  );

  return response.data;
};

/**
 * Customer or Vendor rates a resolved or closed ticket.
 */
export const rateSupportTicketApi = async (
  ticketId,
  payload
) => {
  if (!ticketId) {
    throw new Error("Ticket ID is required");
  }

  const response = await axiosInstance.patch(
    `/support/tickets/${ticketId}/rating`,
    payload
  );

  return response.data;
};

/*
|--------------------------------------------------------------------------
| Shared APIs
|--------------------------------------------------------------------------
*/

/**
 * Customer, Vendor, Support Agent, Admin or Super Admin
 * gets permitted ticket details.
 */
export const getSupportTicketDetailsApi = async (ticketId) => {
  if (!ticketId) {
    throw new Error("Ticket ID is required");
  }

  const response = await axiosInstance.get(
    `/support/tickets/${ticketId}`
  );

  return response.data;
};

/**
 * Add a public reply.
 */
export const replySupportTicketApi = async (
  ticketId,
  message
) => {
  if (!ticketId) {
    throw new Error("Ticket ID is required");
  }

  if (!message?.trim()) {
    throw new Error("Reply message is required");
  }

  const response = await axiosInstance.post(
    `/support/tickets/${ticketId}/reply`,
    {
      message: message.trim(),
    }
  );

  return response.data;
};

/*
|--------------------------------------------------------------------------
| Support Agent, Admin and Super Admin APIs
|--------------------------------------------------------------------------
*/

/**
 * Get Support Agent/Admin dashboard statistics.
 */
export const getSupportDashboardStatsApi = async () => {
  const response = await axiosInstance.get(
    "/support/staff/dashboard"
  );

  return response.data;
};

/**
 * Get all permitted support tickets with filters.
 */
export const getStaffSupportTicketsApi = async (
  params = {}
) => {
  const query = buildQueryString(params);

  const response = await axiosInstance.get(
    `/support/staff/tickets${query}`
  );

  return response.data;
};

/**
 * Get active Support Agents, Admins and Super Admins.
 */
export const getSupportStaffApi = async () => {
  const response = await axiosInstance.get(
    "/support/staff/users"
  );

  return response.data;
};

/**
 * Get active Admin and Super Admin users.
 * Used by the escalation modal.
 */
export const getSupportAdminUsersApi = async () => {
  const response = await axiosInstance.get(
    "/support/staff/admin-users"
  );

  return response.data;
};

/**
 * Add an internal staff-only note.
 */
export const addSupportInternalNoteApi = async (
  ticketId,
  message
) => {
  if (!ticketId) {
    throw new Error("Ticket ID is required");
  }

  if (!message?.trim()) {
    throw new Error("Internal note is required");
  }

  const response = await axiosInstance.post(
    `/support/tickets/${ticketId}/internal-note`,
    {
      message: message.trim(),
    }
  );

  return response.data;
};

/**
 * Assign ticket to a support staff member.
 * Support Agent can only assign to themselves.
 */
export const assignSupportTicketApi = async (
  ticketId,
  assignedToId
) => {
  if (!ticketId) {
    throw new Error("Ticket ID is required");
  }

  const payload = {};

  if (assignedToId) {
    payload.assignedToId = assignedToId;
  }

  const response = await axiosInstance.patch(
    `/support/tickets/${ticketId}/assign`,
    payload
  );

  return response.data;
};

/**
 * Escalate ticket to Admin or Super Admin.
 */
export const escalateSupportTicketApi = async (
  ticketId,
  payload
) => {
  if (!ticketId) {
    throw new Error("Ticket ID is required");
  }

  if (!payload?.escalatedToId) {
    throw new Error("Admin or Super Admin is required");
  }

  if (!payload?.escalationReason?.trim()) {
    throw new Error("Escalation reason is required");
  }

  const response = await axiosInstance.patch(
    `/support/tickets/${ticketId}/escalate`,
    {
      escalatedToId: payload.escalatedToId,
      escalationReason: payload.escalationReason.trim(),
    }
  );

  return response.data;
};

/**
 * Update ticket priority.
 */
export const updateSupportTicketPriorityApi = async (
  ticketId,
  priority
) => {
  if (!ticketId) {
    throw new Error("Ticket ID is required");
  }

  const response = await axiosInstance.patch(
    `/support/tickets/${ticketId}/priority`,
    {
      priority,
    }
  );

  return response.data;
};

/**
 * Update ticket status.
 */
export const updateSupportTicketStatusApi = async (
  ticketId,
  payload
) => {
  if (!ticketId) {
    throw new Error("Ticket ID is required");
  }

  const response = await axiosInstance.patch(
    `/support/tickets/${ticketId}/status`,
    payload
  );

  return response.data;
};

/*
|--------------------------------------------------------------------------
| Admin and Super Admin only APIs
|--------------------------------------------------------------------------
*/

/**
 * Unassign a ticket.
 */
export const unassignSupportTicketApi = async (ticketId) => {
  if (!ticketId) {
    throw new Error("Ticket ID is required");
  }

  const response = await axiosInstance.patch(
    `/support/tickets/${ticketId}/unassign`
  );

  return response.data;
};

/**
 * Archive or restore a ticket.
 */
export const archiveSupportTicketApi = async (
  ticketId,
  isArchived = true
) => {
  if (!ticketId) {
    throw new Error("Ticket ID is required");
  }

  const response = await axiosInstance.patch(
    `/support/tickets/${ticketId}/archive`,
    {
      isArchived,
    }
  );

  return response.data;
};

/*
|--------------------------------------------------------------------------
| Support constants
|--------------------------------------------------------------------------
*/

export const SUPPORT_TICKET_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_CUSTOMER",
  "WAITING_FOR_STAFF",
  "ESCALATED",
  "RESOLVED",
  "CLOSED",
  "REJECTED",
];

export const SUPPORT_TICKET_PRIORITIES = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
];

export const SUPPORT_TICKET_CATEGORIES = [
  "ORDER_ISSUE",
  "PAYMENT_ISSUE",
  "REFUND_REQUEST",
  "WITHDRAWAL_ISSUE",
  "ACCOUNT_ISSUE",
  "PRODUCT_ISSUE",
  "DELIVERY_ISSUE",
  "TECHNICAL_ISSUE",
  "VENDOR_ISSUE",
  "OTHER",
];

export const SUPPORT_STATUS_LABELS = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  WAITING_FOR_CUSTOMER: "Waiting for Customer",
  WAITING_FOR_STAFF: "Waiting for Staff",
  ESCALATED: "Escalated",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  REJECTED: "Rejected",
};

export const SUPPORT_PRIORITY_LABELS = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const SUPPORT_CATEGORY_LABELS = {
  ORDER_ISSUE: "Order Issue",
  PAYMENT_ISSUE: "Payment Issue",
  REFUND_REQUEST: "Refund Request",
  WITHDRAWAL_ISSUE: "Withdrawal Issue",
  ACCOUNT_ISSUE: "Account Issue",
  PRODUCT_ISSUE: "Product Issue",
  DELIVERY_ISSUE: "Delivery Issue",
  TECHNICAL_ISSUE: "Technical Issue",
  VENDOR_ISSUE: "Vendor Issue",
  OTHER: "Other",
};