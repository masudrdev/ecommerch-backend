"use client";

import Link from "next/link";
import StaffTicketDetails from "@/components/support/StaffTicketDetails";
import { useParams, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Loader2,
  MessageCircle,
  RefreshCcw,
  RotateCcw,
  Send,
  Star,
  TicketCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  closeMySupportTicketApi,
  getSupportTicketDetailsApi,
  rateSupportTicketApi,
  reopenMySupportTicketApi,
  replySupportTicketApi,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_PRIORITY_LABELS,
  SUPPORT_STATUS_LABELS,
} from "@/services/ticket.service";

import {
  getLoggedInUserRole,
} from "@/services/orderDetails.service";

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
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_CLASSES[value] || STATUS_CLASSES.OPEN
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
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${PRIORITY_CLASSES[value] ||
        PRIORITY_CLASSES.MEDIUM
        }`}
    >
      {SUPPORT_PRIORITY_LABELS[value] || value}
    </span>
  );
}

function TicketMessage({
  message,
  currentUserRole,
  ticketOwnerId,
}) {
  const senderRole = message?.sender?.role || "";
  const isOwnerMessage =
    message?.senderId === ticketOwnerId ||
    ["CUSTOMER", "VENDOR"].includes(senderRole);

  const isCurrentUserMessage =
    senderRole === currentUserRole && isOwnerMessage;

  const senderName =
    message?.sender?.name ||
    message?.sender?.username ||
    "User";

  return (
    <div
      className={`flex ${isCurrentUserMessage || isOwnerMessage
          ? "justify-end"
          : "justify-start"
        }`}
    >
      <div
        className={`w-full max-w-[92%] rounded-2xl border p-4 sm:max-w-[78%] ${isOwnerMessage
            ? "border-blue-500/20 bg-blue-500/10"
            : "border-white/10 bg-[#0F172A]"
          }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isOwnerMessage
                  ? "bg-blue-500/20 text-blue-300"
                  : "bg-emerald-500/20 text-emerald-300"
                }`}
            >
              <UserRound size={15} />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {senderName}
              </p>

              <p className="text-xs text-slate-400">
                {isOwnerMessage
                  ? senderRole === "VENDOR"
                    ? "Vendor"
                    : "Customer"
                  : senderRole.replaceAll("_", " ")}
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
    </div>
  );
}

function RatingForm({
  ticketId,
  currentRating,
  currentFeedback,
  onCompleted,
}) {
  const [rating, setRating] = useState(
    currentRating || 0
  );
  const [feedback, setFeedback] = useState(
    currentFeedback || ""
  );
  const [submitting, setSubmitting] =
    useState(false);

  const handleSubmit = async () => {
    if (!rating) {
      toast.error("Please select a rating");
      return;
    }

    try {
      setSubmitting(true);

      const result = await rateSupportTicketApi(
        ticketId,
        {
          rating,
          feedback: feedback.trim(),
        }
      );

      toast.success(
        result?.message ||
        "Rating submitted successfully"
      );

      onCompleted();
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          "Failed to submit rating"
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
      <h3 className="font-semibold text-white">
        Rate your support experience
      </h3>

      <p className="mt-1 text-sm text-slate-400">
        Let us know how helpful the support response was.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            className="cursor-pointer"
            aria-label={`${value} star rating`}
          >
            <Star
              size={28}
              className={
                value <= rating
                  ? "fill-amber-400 text-amber-400"
                  : "text-slate-600"
              }
            />
          </button>
        ))}
      </div>

      <textarea
        value={feedback}
        onChange={(event) =>
          setFeedback(event.target.value)
        }
        rows={4}
        maxLength={1000}
        placeholder="Write optional feedback..."
        className="mt-4 w-full resize-y rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-500"
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="mt-3 inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? (
          <Loader2
            size={16}
            className="animate-spin"
          />
        ) : (
          <Star size={16} />
        )}

        Submit Rating
      </button>
    </div>
  );
}

export default function SupportTicketDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const ticketId = Array.isArray(params?.id)
    ? params.id[0]
    : params?.id;

  const [role, setRole] = useState("");
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [reply, setReply] = useState("");
  const [replying, setReplying] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [reopenReason, setReopenReason] =
    useState("");
  const [showReopenForm, setShowReopenForm] =
    useState(false);

  useEffect(() => {
    setRole(getLoggedInUserRole() || "");
  }, []);

  const allowedRole =
    role === "CUSTOMER" || role === "VENDOR";
  const isStaffRole = [
    "SUPPORT_AGENT",
    "ADMIN",
    "SUPER_ADMIN",
  ].includes(role);

  const loadTicket = useCallback(
    async ({ silent = false } = {}) => {
      if (!ticketId || !allowedRole) return;

      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const result =
          await getSupportTicketDetailsApi(ticketId);

        setTicket(result?.ticket || null);
      } catch (error) {
        console.error(
          "Load support ticket error:",
          error?.response?.data || error
        );

        setTicket(null);

        toast.error(
          getErrorMessage(
            error,
            "Failed to load ticket details"
          )
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [ticketId, allowedRole]
  );

useEffect(() => {
  if (!role) return;

  if (isStaffRole) {
    setLoading(false);
    return;
  }

  if (!allowedRole) {
    setLoading(false);
    return;
  }

  loadTicket();
}, [
  role,
  isStaffRole,
  allowedRole,
  loadTicket,
]);

  const handleReply = async (event) => {
    event.preventDefault();

    const message = reply.trim();

    if (message.length < 2) {
      toast.error("Please write a reply");
      return;
    }

    try {
      setReplying(true);

      const result = await replySupportTicketApi(
        ticketId,
        message
      );

      toast.success(
        result?.message || "Reply sent successfully"
      );

      setReply("");
      await loadTicket({ silent: true });
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Failed to send reply")
      );
    } finally {
      setReplying(false);
    }
  };

  const handleClose = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to close this resolved ticket?"
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);

      const result =
        await closeMySupportTicketApi(ticketId);

      toast.success(
        result?.message || "Ticket closed successfully"
      );

      await loadTicket({ silent: true });
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Failed to close ticket")
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopen = async (event) => {
    event.preventDefault();

    const reason = reopenReason.trim();

    if (reason.length < 5) {
      toast.error(
        "Please explain why the ticket should be reopened"
      );
      return;
    }

    try {
      setActionLoading(true);

      const result =
        await reopenMySupportTicketApi(
          ticketId,
          reason
        );

      toast.success(
        result?.message ||
        "Ticket reopened successfully"
      );

      setReopenReason("");
      setShowReopenForm(false);

      await loadTicket({ silent: true });
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          "Failed to reopen ticket"
        )
      );
    } finally {
      setActionLoading(false);
    }
  };

  const publicMessages = useMemo(
    () =>
      Array.isArray(ticket?.messages)
        ? ticket.messages.filter(
          (message) => !message.isInternal
        )
        : [],
    [ticket]
  );

  const canReply =
    ticket &&
    !["CLOSED", "REJECTED"].includes(
      ticket.status
    );

  const canClose = ticket?.status === "RESOLVED";

  const canReopen = ["RESOLVED", "CLOSED"].includes(
    ticket?.status
  );

  const canRate = ["RESOLVED", "CLOSED"].includes(
    ticket?.status
  );

  if (!role || loading) {
    return (
      <div className="flex min-h-[450px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2
            size={30}
            className="animate-spin text-blue-400"
          />

          <p className="text-sm">
            Loading ticket details...
          </p>
        </div>
      </div>
    );
  }
if (isStaffRole) {
  return (
    <StaffTicketDetails
      ticketId={ticketId}
      role={role}
    />
  );
}
  if (!allowedRole) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-6">
        <div className="flex gap-3">
          <AlertCircle
            size={22}
            className="shrink-0 text-amber-400"
          />

          <div>
            <h1 className="font-bold text-white">
              Access restricted
            </h1>

            <p className="mt-2 text-sm text-slate-300">
              This page is only for Customers and Vendors.
            </p>
          </div>
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
          <XCircle
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

          <button
            type="button"
            onClick={() =>
              router.push("/dashboard/support")
            }
            className="mt-5 cursor-pointer rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Return to Support
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/dashboard/support"
            className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300"
          >
            <ArrowLeft size={17} />
            Back to Support
          </Link>

          <p className="text-xs font-semibold text-blue-400">
            {ticket.ticketNumber}
          </p>

          <h1 className="mt-1 break-words text-xl font-bold text-white sm:text-2xl">
            {ticket.subject}
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Created {formatDate(ticket.createdAt)}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            loadTicket({ silent: true })
          }
          disabled={refreshing}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 space-y-6">
          <div className="rounded-xl border border-white/10 bg-[#1E293B]">
            <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex items-center gap-2">
                <MessageCircle
                  size={20}
                  className="text-blue-400"
                />

                <h2 className="font-bold text-white">
                  Conversation
                </h2>
              </div>

              <p className="text-xs text-slate-400">
                {publicMessages.length} message(s)
              </p>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              {publicMessages.length === 0 ? (
                <div className="py-12 text-center">
                  <MessageCircle
                    size={34}
                    className="mx-auto text-slate-600"
                  />

                  <p className="mt-3 text-sm text-slate-400">
                    No messages available.
                  </p>
                </div>
              ) : (
                publicMessages.map((message) => (
                  <TicketMessage
                    key={message.id}
                    message={message}
                    currentUserRole={role}
                    ticketOwnerId={ticket.userId}
                  />
                ))
              )}
            </div>
          </div>

          {canReply ? (
            <form
              onSubmit={handleReply}
              className="rounded-xl border border-white/10 bg-[#1E293B] p-4 sm:p-5"
            >
              <label
                htmlFor="support-reply"
                className="text-sm font-semibold text-white"
              >
                Add Reply
              </label>

              <textarea
                id="support-reply"
                value={reply}
                onChange={(event) =>
                  setReply(event.target.value)
                }
                rows={6}
                maxLength={3000}
                placeholder="Write your reply or provide more information..."
                className="mt-3 min-h-36 w-full resize-y rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
              />

              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  {reply.length}/3000
                </p>

                <button
                  type="submit"
                  disabled={replying}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {replying ? (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  ) : (
                    <Send size={17} />
                  )}

                  Send Reply
                </button>
              </div>
            </form>
          ) : (
            <div className="rounded-xl border border-slate-500/20 bg-slate-500/10 p-4">
              <p className="text-sm text-slate-300">
                This ticket is closed or rejected and cannot
                receive new replies.
              </p>
            </div>
          )}

          {showReopenForm && (
            <form
              onSubmit={handleReopen}
              className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 sm:p-5"
            >
              <h3 className="font-semibold text-white">
                Reopen Ticket
              </h3>

              <p className="mt-1 text-sm text-slate-400">
                Explain why the issue still needs support.
              </p>

              <textarea
                value={reopenReason}
                onChange={(event) =>
                  setReopenReason(event.target.value)
                }
                rows={5}
                maxLength={1500}
                placeholder="Describe what is still unresolved..."
                className="mt-4 w-full resize-y rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
              />

              <div className="mt-3 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowReopenForm(false);
                    setReopenReason("");
                  }}
                  disabled={actionLoading}
                  className="cursor-pointer rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-600"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading ? (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <RotateCcw size={16} />
                  )}

                  Confirm Reopen
                </button>
              </div>
            </form>
          )}

          {canRate && (
            <RatingForm
              ticketId={ticketId}
              currentRating={ticket.customerRating}
              currentFeedback={
                ticket.customerFeedback
              }
              onCompleted={() =>
                loadTicket({ silent: true })
              }
            />
          )}
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

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs text-slate-500">
                  Status
                </p>

                <div className="mt-2">
                  <StatusBadge status={ticket.status} />
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Priority
                </p>

                <div className="mt-2">
                  <PriorityBadge
                    priority={ticket.priority}
                  />
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Category
                </p>

                <p className="mt-1 text-sm font-medium text-slate-200">
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
                  Assigned Staff
                </p>

                <p className="mt-1 text-sm font-medium text-slate-200">
                  {ticket?.assignedTo?.name ||
                    "Not assigned yet"}
                </p>
              </div>

              {ticket?.escalatedTo && (
                <div>
                  <p className="text-xs text-slate-500">
                    Escalated To
                  </p>

                  <p className="mt-1 text-sm font-medium text-purple-300">
                    {ticket.escalatedTo.name}
                  </p>
                </div>
              )}

              {ticket?.orderId && (
                <div>
                  <p className="text-xs text-slate-500">
                    Related Order ID
                  </p>

                  <Link
                    href={`/dashboard/orders/${ticket.orderId}`}
                    className="mt-1 block break-all text-sm font-medium text-blue-400 hover:text-blue-300"
                  >
                    {ticket.orderId}
                  </Link>
                </div>
              )}

              <div>
                <p className="text-xs text-slate-500">
                  Last Activity
                </p>

                <p className="mt-1 flex items-center gap-2 text-sm text-slate-300">
                  <Clock3 size={14} />
                  {formatDate(ticket.lastActivityAt)}
                </p>
              </div>
            </div>
          </div>

          {ticket?.resolutionSummary && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5">
              <div className="flex items-center gap-2">
                <CheckCircle2
                  size={19}
                  className="text-emerald-400"
                />

                <h2 className="font-bold text-white">
                  Resolution
                </h2>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                {ticket.resolutionSummary}
              </p>
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-[#1E293B] p-5">
            <h2 className="font-bold text-white">
              Ticket Actions
            </h2>

            <div className="mt-4 space-y-3">
              {canClose && (
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={actionLoading}
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading ? (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}

                  Close Ticket
                </button>
              )}

              {canReopen && (
                <button
                  type="button"
                  onClick={() =>
                    setShowReopenForm(true)
                  }
                  disabled={
                    actionLoading || showReopenForm
                  }
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RotateCcw size={16} />
                  Reopen Ticket
                </button>
              )}

              {!canClose && !canReopen && (
                <p className="text-sm leading-6 text-slate-400">
                  The support team is currently working on
                  this ticket. You can add another reply if
                  more information is needed.
                </p>
              )}
            </div>
          </div>

          {ticket.customerRating && (
            <div className="rounded-xl border border-white/10 bg-[#1E293B] p-5">
              <h2 className="font-bold text-white">
                Your Rating
              </h2>

              <div className="mt-3 flex gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <Star
                    key={value}
                    size={20}
                    className={
                      value <= ticket.customerRating
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-600"
                    }
                  />
                ))}
              </div>

              {ticket.customerFeedback && (
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {ticket.customerFeedback}
                </p>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}