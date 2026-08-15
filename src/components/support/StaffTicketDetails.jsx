"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Loader2,
  LockKeyhole,
  MessageCircle,
  RefreshCcw,
  RotateCcw,
  Send,
  ShieldAlert,
  TicketCheck,
  UserCheck,
  UserRound,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  addSupportInternalNoteApi,
  assignSupportTicketApi,
  escalateSupportTicketApi,
  getSupportAdminUsersApi,
  getSupportStaffApi,
  getSupportTicketDetailsApi,
  replySupportTicketApi,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_PRIORITY_LABELS,
  SUPPORT_STATUS_LABELS,
  SUPPORT_TICKET_PRIORITIES,
  SUPPORT_TICKET_STATUSES,
  unassignSupportTicketApi,
  updateSupportTicketPriorityApi,
  updateSupportTicketStatusApi,
} from "@/services/ticket.service";

const STATUS_CLASSES = {
  OPEN: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
  IN_PROGRESS:
    "border-blue-500/20 bg-blue-500/10 text-blue-300",
  WAITING_FOR_CUSTOMER:
    "border-amber-500/20 bg-amber-500/10 text-amber-300",
  WAITING_FOR_STAFF:
    "border-orange-500/20 bg-orange-500/10 text-orange-300",
  ESCALATED:
    "border-purple-500/20 bg-purple-500/10 text-purple-300",
  RESOLVED:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  CLOSED:
    "border-slate-500/20 bg-slate-500/10 text-slate-300",
  REJECTED:
    "border-red-500/20 bg-red-500/10 text-red-300",
};

const PRIORITY_CLASSES = {
  LOW: "border-slate-500/20 bg-slate-500/10 text-slate-300",
  MEDIUM:
    "border-blue-500/20 bg-blue-500/10 text-blue-300",
  HIGH:
    "border-orange-500/20 bg-orange-500/10 text-orange-300",
  URGENT:
    "border-red-500/20 bg-red-500/10 text-red-300",
};

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function StatusBadge({ status }) {
  const value = String(status || "OPEN").toUpperCase();

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
        STATUS_CLASSES[value] || STATUS_CLASSES.OPEN
      }`}
    >
      {SUPPORT_STATUS_LABELS[value] ||
        value.replaceAll("_", " ")}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const value = String(
    priority || "MEDIUM"
  ).toUpperCase();

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
        PRIORITY_CLASSES[value] ||
        PRIORITY_CLASSES.MEDIUM
      }`}
    >
      {SUPPORT_PRIORITY_LABELS[value] || value}
    </span>
  );
}

function MessageItem({ message, ticketOwnerId }) {
  const isInternal = Boolean(message?.isInternal);

  const isCustomerOrVendor =
    message?.senderId === ticketOwnerId ||
    ["CUSTOMER", "VENDOR"].includes(
      message?.sender?.role
    );

  const senderName =
    message?.sender?.name ||
    message?.sender?.username ||
    "Unknown User";

  return (
    <div
      className={`rounded-xl border p-4 ${
        isInternal
          ? "border-amber-500/20 bg-amber-500/10"
          : isCustomerOrVendor
            ? "border-blue-500/20 bg-blue-500/10"
            : "border-white/10 bg-[#0F172A]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              isInternal
                ? "bg-amber-500/20 text-amber-300"
                : isCustomerOrVendor
                  ? "bg-blue-500/20 text-blue-300"
                  : "bg-emerald-500/20 text-emerald-300"
            }`}
          >
            {isInternal ? (
              <LockKeyhole size={16} />
            ) : (
              <UserRound size={16} />
            )}
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {senderName}
            </p>

            <p className="mt-0.5 text-xs text-slate-400">
              {message?.sender?.role?.replaceAll("_", " ") ||
                "User"}

              {isInternal && (
                <span className="ml-2 font-semibold text-amber-300">
                  Internal Note
                </span>
              )}
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          {formatDate(message?.createdAt)}
        </p>
      </div>

      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-200">
        {message?.message}
      </p>
    </div>
  );
}

export default function StaffTicketDetails({
  ticketId,
  role,
}) {
  const [ticket, setTicket] = useState(null);
  const [staffUsers, setStaffUsers] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [actionLoading, setActionLoading] =
    useState(false);

  const [publicReply, setPublicReply] = useState("");
  const [internalNote, setInternalNote] =
    useState("");

  const [selectedStaffId, setSelectedStaffId] =
    useState("");
  const [selectedPriority, setSelectedPriority] =
    useState("MEDIUM");
  const [selectedStatus, setSelectedStatus] =
    useState("OPEN");

  const [resolutionSummary, setResolutionSummary] =
    useState("");

  const [escalatedToId, setEscalatedToId] =
    useState("");
  const [escalationReason, setEscalationReason] =
    useState("");

  const isSupportAgent = role === "SUPPORT_AGENT";
  const isAdmin = role === "ADMIN";
  const isSuperAdmin = role === "SUPER_ADMIN";
  const canManageAssignments = isAdmin || isSuperAdmin;

  const loadTicket = useCallback(
    async ({ silent = false } = {}) => {
      if (!ticketId) return;

      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const result =
          await getSupportTicketDetailsApi(ticketId);

        const currentTicket = result?.ticket || null;

        setTicket(currentTicket);

        if (currentTicket) {
          setSelectedPriority(
            currentTicket.priority || "MEDIUM"
          );

          setSelectedStatus(
            currentTicket.status || "OPEN"
          );

          setSelectedStaffId(
            currentTicket.assignedToId || ""
          );
        }
      } catch (error) {
        console.error(
          "Staff ticket details error:",
          error?.response?.data || error
        );

        setTicket(null);

        toast.error(
          getErrorMessage(
            error,
            "Failed to load support ticket"
          )
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [ticketId]
  );

  const loadStaffOptions = useCallback(async () => {
    try {
      const requests = [getSupportAdminUsersApi()];

      if (canManageAssignments) {
        requests.push(getSupportStaffApi());
      }

      const results = await Promise.all(requests);

      setAdminUsers(
        Array.isArray(results[0]?.users)
          ? results[0].users
          : []
      );

      if (canManageAssignments) {
        setStaffUsers(
          Array.isArray(results[1]?.users)
            ? results[1].users
            : []
        );
      }
    } catch (error) {
      console.error(
        "Support staff options error:",
        error?.response?.data || error
      );

      toast.error(
        getErrorMessage(
          error,
          "Failed to load support staff"
        )
      );
    }
  }, [canManageAssignments]);

  useEffect(() => {
    loadTicket();
    loadStaffOptions();
  }, [loadTicket, loadStaffOptions]);

  const messages = useMemo(
    () =>
      Array.isArray(ticket?.messages)
        ? ticket.messages
        : [],
    [ticket]
  );

  const handlePublicReply = async (event) => {
    event.preventDefault();

    const message = publicReply.trim();

    if (message.length < 2) {
      toast.error("Please write a public reply");
      return;
    }

    try {
      setActionLoading(true);

      const result = await replySupportTicketApi(
        ticketId,
        message
      );

      toast.success(
        result?.message || "Reply sent successfully"
      );

      setPublicReply("");
      await loadTicket({ silent: true });
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Failed to send reply")
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleInternalNote = async (event) => {
    event.preventDefault();

    const message = internalNote.trim();

    if (message.length < 2) {
      toast.error("Please write an internal note");
      return;
    }

    try {
      setActionLoading(true);

      const result =
        await addSupportInternalNoteApi(
          ticketId,
          message
        );

      toast.success(
        result?.message ||
          "Internal note added successfully"
      );

      setInternalNote("");
      await loadTicket({ silent: true });
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          "Failed to add internal note"
        )
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleClaimTicket = async () => {
    try {
      setActionLoading(true);

      const result =
        await assignSupportTicketApi(ticketId);

      toast.success(
        result?.message ||
          "Ticket claimed successfully"
      );

      await loadTicket({ silent: true });
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          "Failed to claim ticket"
        )
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignStaff = async () => {
    if (!selectedStaffId) {
      toast.error("Please select a staff member");
      return;
    }

    try {
      setActionLoading(true);

      const result = await assignSupportTicketApi(
        ticketId,
        selectedStaffId
      );

      toast.success(
        result?.message ||
          "Ticket assigned successfully"
      );

      await loadTicket({ silent: true });
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          "Failed to assign ticket"
        )
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnassign = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to unassign this ticket?"
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);

      const result =
        await unassignSupportTicketApi(ticketId);

      toast.success(
        result?.message ||
          "Ticket unassigned successfully"
      );

      setSelectedStaffId("");
      await loadTicket({ silent: true });
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          "Failed to unassign ticket"
        )
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handlePriorityUpdate = async () => {
    try {
      setActionLoading(true);

      const result =
        await updateSupportTicketPriorityApi(
          ticketId,
          selectedPriority
        );

      toast.success(
        result?.message ||
          "Priority updated successfully"
      );

      await loadTicket({ silent: true });
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          "Failed to update priority"
        )
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    const needsSummary = [
      "RESOLVED",
      "REJECTED",
    ].includes(selectedStatus);

    if (
      needsSummary &&
      resolutionSummary.trim().length < 5
    ) {
      toast.error(
        "Resolution or rejection summary is required"
      );
      return;
    }

    try {
      setActionLoading(true);

      const result =
        await updateSupportTicketStatusApi(
          ticketId,
          {
            status: selectedStatus,
            resolutionSummary:
              resolutionSummary.trim() || undefined,
          }
        );

      toast.success(
        result?.message ||
          "Status updated successfully"
      );

      setResolutionSummary("");
      await loadTicket({ silent: true });
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          "Failed to update status"
        )
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleEscalation = async (event) => {
    event.preventDefault();

    if (!escalatedToId) {
      toast.error("Select an Admin or Super Admin");
      return;
    }

    if (escalationReason.trim().length < 5) {
      toast.error("Write an escalation reason");
      return;
    }

    try {
      setActionLoading(true);

      const result =
        await escalateSupportTicketApi(ticketId, {
          escalatedToId,
          escalationReason:
            escalationReason.trim(),
        });

      toast.success(
        result?.message ||
          "Ticket escalated successfully"
      );

      setEscalationReason("");
      await loadTicket({ silent: true });
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          "Failed to escalate ticket"
        )
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[450px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2
            size={30}
            className="animate-spin text-blue-400"
          />

          <p className="text-sm">
            Loading staff ticket details...
          </p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="space-y-5">
        <Link
          href="/dashboard/support"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300"
        >
          <ArrowLeft size={17} />
          Back to Support
        </Link>

        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-8 text-center">
          <AlertTriangle
            size={38}
            className="mx-auto text-red-400"
          />

          <h1 className="mt-4 text-lg font-bold text-white">
            Ticket not found
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            The ticket does not exist or you do not have
            permission to view it.
          </p>
        </div>
      </div>
    );
  }

  const canReply = ![
    "CLOSED",
    "REJECTED",
  ].includes(ticket.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/dashboard/support"
            className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300"
          >
            <ArrowLeft size={17} />
            Back to Support Dashboard
          </Link>

          <p className="text-xs font-semibold text-blue-400">
            {ticket.ticketNumber}
          </p>

          <h1 className="mt-1 break-words text-xl font-bold text-white sm:text-2xl">
            {ticket.subject}
          </h1>

          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge status={ticket.status} />
            <PriorityBadge
              priority={ticket.priority}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            loadTicket({ silent: true })
          }
          disabled={refreshing}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-600 disabled:opacity-60"
        >
          <RefreshCcw
            size={16}
            className={
              refreshing ? "animate-spin" : ""
            }
          />

          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <div className="rounded-xl border border-white/10 bg-[#1E293B] p-4 sm:p-5">
            <h2 className="font-bold text-white">
              Problem Description
            </h2>

            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">
              {ticket.description}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#1E293B]">
            <div className="flex items-center justify-between border-b border-white/10 p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <MessageCircle
                  size={19}
                  className="text-blue-400"
                />

                <h2 className="font-bold text-white">
                  Conversation
                </h2>
              </div>

              <p className="text-xs text-slate-400">
                {messages.length} message(s)
              </p>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              {messages.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  No messages found.
                </p>
              ) : (
                messages.map((message) => (
                  <MessageItem
                    key={message.id}
                    message={message}
                    ticketOwnerId={ticket.userId}
                  />
                ))
              )}
            </div>
          </div>

          {canReply && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <form
                onSubmit={handlePublicReply}
                className="rounded-xl border border-white/10 bg-[#1E293B] p-4 sm:p-5"
              >
                <div className="flex items-center gap-2">
                  <Send
                    size={18}
                    className="text-blue-400"
                  />

                  <h2 className="font-bold text-white">
                    Public Reply
                  </h2>
                </div>

                <p className="mt-1 text-xs text-slate-400">
                  Customer or Vendor will see this reply.
                </p>

                <textarea
                  value={publicReply}
                  onChange={(event) =>
                    setPublicReply(event.target.value)
                  }
                  rows={6}
                  maxLength={3000}
                  placeholder="Write a public response..."
                  className="mt-4 w-full resize-y rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                />

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {actionLoading ? (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Send size={16} />
                  )}

                  Send Reply
                </button>
              </form>

              <form
                onSubmit={handleInternalNote}
                className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 sm:p-5"
              >
                <div className="flex items-center gap-2">
                  <LockKeyhole
                    size={18}
                    className="text-amber-400"
                  />

                  <h2 className="font-bold text-white">
                    Internal Note
                  </h2>
                </div>

                <p className="mt-1 text-xs text-slate-400">
                  Only support staff can see this note.
                </p>

                <textarea
                  value={internalNote}
                  onChange={(event) =>
                    setInternalNote(event.target.value)
                  }
                  rows={6}
                  maxLength={3000}
                  placeholder="Write a staff-only note..."
                  className="mt-4 w-full resize-y rounded-lg border border-amber-500/20 bg-[#0F172A] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-500 focus:border-amber-500"
                />

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-60"
                >
                  {actionLoading ? (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <LockKeyhole size={16} />
                  )}

                  Add Internal Note
                </button>
              </form>
            </div>
          )}

          <form
            onSubmit={handleEscalation}
            className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-4 sm:p-5"
          >
            <div className="flex items-center gap-2">
              <ShieldAlert
                size={19}
                className="text-purple-400"
              />

              <h2 className="font-bold text-white">
                Escalate Ticket
              </h2>
            </div>

            <p className="mt-1 text-sm text-slate-400">
              Send this ticket to an Admin or Super Admin
              when higher-level action is required.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <select
                value={escalatedToId}
                onChange={(event) =>
                  setEscalatedToId(event.target.value)
                }
                className="rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none focus:border-purple-500"
              >
                <option value="">
                  Select Admin or Super Admin
                </option>

                {adminUsers.map((user) => (
                  <option
                    key={user.id}
                    value={user.id}
                  >
                    {user.name} —{" "}
                    {user.role.replaceAll("_", " ")}
                  </option>
                ))}
              </select>

              <textarea
                value={escalationReason}
                onChange={(event) =>
                  setEscalationReason(
                    event.target.value
                  )
                }
                rows={3}
                maxLength={1500}
                placeholder="Why does this ticket need escalation?"
                className="resize-y rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-purple-500"
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="mt-4 inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
            >
              <ShieldAlert size={16} />
              Escalate Ticket
            </button>
          </form>
        </div>

        <aside className="space-y-5">
          <div className="rounded-xl border border-white/10 bg-[#1E293B] p-5">
            <div className="flex items-center gap-2">
              <TicketCheck
                size={19}
                className="text-blue-400"
              />

              <h2 className="font-bold text-white">
                Ticket Information
              </h2>
            </div>

            <div className="mt-5 space-y-4 text-sm">
              <div>
                <p className="text-xs text-slate-500">
                  Created By
                </p>

                <p className="mt-1 font-semibold text-white">
                  {ticket?.user?.name ||
                    ticket?.user?.username ||
                    "Unknown"}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  {ticket?.user?.role?.replaceAll(
                    "_",
                    " "
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Email
                </p>

                <p className="mt-1 break-all text-slate-300">
                  {ticket?.user?.email || "-"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Category
                </p>

                <p className="mt-1 text-slate-300">
                  {SUPPORT_CATEGORY_LABELS[
                    ticket.category
                  ] ||
                    ticket.category?.replaceAll(
                      "_",
                      " "
                    )}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Assigned To
                </p>

                <p className="mt-1 text-slate-300">
                  {ticket?.assignedTo?.name ||
                    "Unassigned"}
                </p>
              </div>

              {ticket?.escalatedTo && (
                <div>
                  <p className="text-xs text-slate-500">
                    Escalated To
                  </p>

                  <p className="mt-1 font-medium text-purple-300">
                    {ticket.escalatedTo.name}
                  </p>
                </div>
              )}

              {ticket?.orderId && (
                <div>
                  <p className="text-xs text-slate-500">
                    Related Order
                  </p>

                  <Link
                    href={`/dashboard/orders/${ticket.orderId}`}
                    className="mt-1 block break-all text-blue-400 hover:text-blue-300"
                  >
                    {ticket.orderId}
                  </Link>
                </div>
              )}

              <div>
                <p className="text-xs text-slate-500">
                  Last Activity
                </p>

                <p className="mt-1 flex items-center gap-2 text-slate-300">
                  <Clock3 size={14} />
                  {formatDate(ticket.lastActivityAt)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#1E293B] p-5">
            <div className="flex items-center gap-2">
              <UserCheck
                size={19}
                className="text-indigo-400"
              />

              <h2 className="font-bold text-white">
                Assignment
              </h2>
            </div>

            {isSupportAgent ? (
              <div className="mt-4">
                {ticket.assignedToId ? (
                  <div className="rounded-lg border border-white/10 bg-[#0F172A] p-3">
                    <p className="text-xs text-slate-500">
                      Currently assigned to
                    </p>

                    <p className="mt-1 font-semibold text-white">
                      {ticket?.assignedTo?.name ||
                        "Support Staff"}
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleClaimTicket}
                    disabled={actionLoading}
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {actionLoading ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <UserCheck size={16} />
                    )}

                    Claim Ticket
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <select
                  value={selectedStaffId}
                  onChange={(event) =>
                    setSelectedStaffId(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                >
                  <option value="">
                    Select Support Staff
                  </option>

                  {staffUsers.map((user) => (
                    <option
                      key={user.id}
                      value={user.id}
                    >
                      {user.name} —{" "}
                      {user.role.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleAssignStaff}
                  disabled={actionLoading}
                  className="w-full cursor-pointer rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  Assign / Reassign
                </button>

                {ticket.assignedToId && (
                  <button
                    type="button"
                    onClick={handleUnassign}
                    disabled={actionLoading}
                    className="w-full cursor-pointer rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-600 disabled:opacity-60"
                  >
                    Unassign Ticket
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-[#1E293B] p-5">
            <h2 className="font-bold text-white">
              Update Priority
            </h2>

            <select
              value={selectedPriority}
              onChange={(event) =>
                setSelectedPriority(event.target.value)
              }
              className="mt-4 w-full rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
            >
              {SUPPORT_TICKET_PRIORITIES.map(
                (priority) => (
                  <option
                    key={priority}
                    value={priority}
                  >
                    {SUPPORT_PRIORITY_LABELS[priority]}
                  </option>
                )
              )}
            </select>

            <button
              type="button"
              onClick={handlePriorityUpdate}
              disabled={actionLoading}
              className="mt-3 w-full cursor-pointer rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              Update Priority
            </button>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#1E293B] p-5">
            <h2 className="font-bold text-white">
              Update Status
            </h2>

            <select
              value={selectedStatus}
              onChange={(event) =>
                setSelectedStatus(event.target.value)
              }
              className="mt-4 w-full rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
            >
              {SUPPORT_TICKET_STATUSES.map(
                (status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {SUPPORT_STATUS_LABELS[status]}
                  </option>
                )
              )}
            </select>

            {["RESOLVED", "REJECTED"].includes(
              selectedStatus
            ) && (
              <textarea
                value={resolutionSummary}
                onChange={(event) =>
                  setResolutionSummary(
                    event.target.value
                  )
                }
                rows={4}
                maxLength={1500}
                placeholder={
                  selectedStatus === "RESOLVED"
                    ? "Explain how the issue was resolved..."
                    : "Explain why the request was rejected..."
                }
                className="mt-3 w-full resize-y rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-500"
              />
            )}

            <button
              type="button"
              onClick={handleStatusUpdate}
              disabled={actionLoading}
              className="mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {selectedStatus === "OPEN" ? (
                <RotateCcw size={16} />
              ) : (
                <CheckCircle2 size={16} />
              )}

              Update Status
            </button>
          </div>

          {ticket?.resolutionSummary && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5">
              <h2 className="font-bold text-white">
                Resolution Summary
              </h2>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                {ticket.resolutionSummary}
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}