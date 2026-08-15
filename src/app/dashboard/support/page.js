"use client";

import Link from "next/link";
import StaffSupportDashboard from "@/components/support/StaffSupportDashboard";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Filter,
  Inbox,
  Loader2,
  MessageCircle,
  Plus,
  Search,
  Send,
  TicketCheck,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  createSupportTicketApi,
  getMySupportTicketsApi,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_PRIORITY_LABELS,
  SUPPORT_STATUS_LABELS,
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_TICKET_PRIORITIES,
  SUPPORT_TICKET_STATUSES,
} from "@/services/ticket.service";

import {
  getLoggedInUserRole,
} from "@/services/orderDetails.service";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const INITIAL_FORM = {
  subject: "",
  category: "ORDER_ISSUE",
  priority: "MEDIUM",
  orderId: "",
  description: "",
};

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
  HIGH: "border-orange-500/20 bg-orange-500/10 text-orange-300",
  URGENT:
    "border-red-500/20 bg-red-500/10 text-red-300",
};

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

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

function StatusBadge({ status }) {
  const normalizedStatus = String(
    status || "OPEN"
  ).toUpperCase();

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
        STATUS_CLASSES[normalizedStatus] ||
        STATUS_CLASSES.OPEN
      }`}
    >
      {SUPPORT_STATUS_LABELS[normalizedStatus] ||
        normalizedStatus.replaceAll("_", " ")}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const normalizedPriority = String(
    priority || "MEDIUM"
  ).toUpperCase();

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
        PRIORITY_CLASSES[normalizedPriority] ||
        PRIORITY_CLASSES.MEDIUM
      }`}
    >
      {SUPPORT_PRIORITY_LABELS[normalizedPriority] ||
        normalizedPriority}
    </span>
  );
}

function EmptyState({ onCreate }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center px-5 py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
        <Inbox size={30} />
      </div>

      <h3 className="text-lg font-bold text-white">
        No support tickets found
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
        Create a ticket to share your order, payment,
        delivery, account or technical problem with our
        support team.
      </p>

      <button
        type="button"
        onClick={onCreate}
        className="mt-5 inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        <Plus size={17} />
        Create Ticket
      </button>
    </div>
  );
}

function TicketCard({ ticket }) {
  const latestMessage = ticket?.messages?.[0];

  return (
    <div className="rounded-xl border border-white/10 bg-[#0F172A] p-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-blue-400">
              {ticket?.ticketNumber || "Support Ticket"}
            </p>

            <h3 className="mt-1 break-words font-semibold text-white">
              {ticket?.subject || "Untitled ticket"}
            </h3>
          </div>

          <PriorityBadge
            priority={ticket?.priority}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={ticket?.status} />

          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
            {SUPPORT_CATEGORY_LABELS[
              ticket?.category
            ] ||
              ticket?.category?.replaceAll("_", " ") ||
              "Other"}
          </span>
        </div>

        {latestMessage?.message && (
          <p className="line-clamp-2 text-sm leading-6 text-slate-400">
            {latestMessage.message}
          </p>
        )}

        <div className="grid grid-cols-1 gap-2 border-t border-white/10 pt-3 text-xs text-slate-400 sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <Clock3 size={14} />
            Updated {formatDate(ticket?.lastActivityAt)}
          </div>

          <div className="flex items-center gap-2 sm:justify-end">
            <MessageCircle size={14} />
            {ticket?._count?.messages || 0} message(s)
          </div>
        </div>

        <Link
          href={`/dashboard/support/${ticket.id}`}
          className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-600"
        >
          <Eye size={16} />
          View Ticket
        </Link>
      </div>
    </div>
  );
}

function CreateTicketModal({
  open,
  onClose,
  onCreated,
}) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] =
    useState(false);

  useEffect(() => {
    if (!open) {
      setForm(INITIAL_FORM);
      setSubmitting(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape" && !submitting) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );

      document.body.style.overflow = "";
    };
  }, [open, onClose, submitting]);

  if (!open) return null;

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const subject = form.subject.trim();
    const description = form.description.trim();

    if (subject.length < 5) {
      toast.error(
        "Subject must be at least 5 characters"
      );
      return;
    }

    if (description.length < 10) {
      toast.error(
        "Description must be at least 10 characters"
      );
      return;
    }

    try {
      setSubmitting(true);

      const result = await createSupportTicketApi({
        subject,
        description,
        category: form.category,
        priority: form.priority,
        orderId: form.orderId.trim() || undefined,
      });

      toast.success(
        result?.message ||
          "Support ticket created successfully"
      );

      setForm(INITIAL_FORM);
      onCreated(result?.ticket);
    } catch (error) {
      console.error(
        "Create support ticket error:",
        error?.response?.data || error
      );

      toast.error(
        getErrorMessage(
          error,
          "Failed to create support ticket"
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-white/10 bg-[#111827] shadow-2xl sm:max-w-2xl sm:rounded-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#111827] px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-white">
              Create Support Ticket
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Share complete details so our team can help
              quickly.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close modal"
          >
            <X size={19} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 p-4 sm:p-6"
        >
          <div>
            <label
              htmlFor="ticket-subject"
              className="mb-2 block text-sm font-semibold text-slate-200"
            >
              Subject
              <span className="ml-1 text-red-400">
                *
              </span>
            </label>

            <input
              id="ticket-subject"
              value={form.subject}
              onChange={(event) =>
                updateField(
                  "subject",
                  event.target.value
                )
              }
              maxLength={150}
              placeholder="Example: Payment completed but order is unpaid"
              className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
            />

            <div className="mt-1 flex justify-end">
              <span className="text-xs text-slate-500">
                {form.subject.length}/150
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="ticket-category"
                className="mb-2 block text-sm font-semibold text-slate-200"
              >
                Category
              </label>

              <select
                id="ticket-category"
                value={form.category}
                onChange={(event) =>
                  updateField(
                    "category",
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
              >
                {SUPPORT_TICKET_CATEGORIES.map(
                  (category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {SUPPORT_CATEGORY_LABELS[
                        category
                      ]}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="ticket-priority"
                className="mb-2 block text-sm font-semibold text-slate-200"
              >
                Priority
              </label>

              <select
                id="ticket-priority"
                value={form.priority}
                onChange={(event) =>
                  updateField(
                    "priority",
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
              >
                {SUPPORT_TICKET_PRIORITIES.map(
                  (priority) => (
                    <option
                      key={priority}
                      value={priority}
                    >
                      {SUPPORT_PRIORITY_LABELS[
                        priority
                      ]}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="ticket-order-id"
              className="mb-2 block text-sm font-semibold text-slate-200"
            >
              Related Order ID
              <span className="ml-2 text-xs font-normal text-slate-500">
                Optional
              </span>
            </label>

            <input
              id="ticket-order-id"
              value={form.orderId}
              onChange={(event) =>
                updateField(
                  "orderId",
                  event.target.value
                )
              }
              placeholder="Enter order ID or leave empty"
              className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="ticket-description"
              className="mb-2 block text-sm font-semibold text-slate-200"
            >
              Problem Description
              <span className="ml-1 text-red-400">
                *
              </span>
            </label>

            <textarea
              id="ticket-description"
              value={form.description}
              onChange={(event) =>
                updateField(
                  "description",
                  event.target.value
                )
              }
              rows={7}
              maxLength={3000}
              placeholder="Explain what happened, when it happened and what help you need..."
              className="min-h-40 w-full resize-y rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
            />

            <div className="mt-1 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Minimum 10 characters
              </span>

              <span className="text-xs text-slate-500">
                {form.description.length}/3000
              </span>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="cursor-pointer rounded-lg bg-slate-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={17} />
                  Submit Ticket
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Main page
|--------------------------------------------------------------------------
*/

export default function SupportPage() {
  const [role, setRole] = useState("");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [createModalOpen, setCreateModalOpen] =
    useState(false);

  const [searchInput, setSearchInput] =
    useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [category, setCategory] = useState("all");

  const [page, setPage] = useState(1);
  const limit = 10;

  const [pagination, setPagination] =
    useState({
      page: 1,
      limit,
      total: 0,
      totalPages: 1,
    });

  const allowedRole =
    role === "CUSTOMER" || role === "VENDOR";

  useEffect(() => {
    setRole(getLoggedInUserRole() || "");
  }, []);

  const loadTickets = useCallback(
    async ({ silent = false } = {}) => {
      if (!allowedRole) return;

      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const result =
          await getMySupportTicketsApi({
            page,
            limit,
            search,
            status,
            priority,
            category,
          });

        setTickets(
          Array.isArray(result?.tickets)
            ? result.tickets
            : []
        );

        setPagination(
          result?.pagination || {
            page,
            limit,
            total: 0,
            totalPages: 1,
          }
        );
      } catch (error) {
        console.error(
          "Support tickets fetch error:",
          error?.response?.data || error
        );

        setTickets([]);

        toast.error(
          getErrorMessage(
            error,
            "Failed to load support tickets"
          )
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      allowedRole,
      page,
      search,
      status,
      priority,
      category,
    ]
  );

useEffect(() => {
  if (!role) return;

  if (
    ["SUPPORT_AGENT", "ADMIN", "SUPER_ADMIN"].includes(
      role
    )
  ) {
    setLoading(false);
    return;
  }

  if (!allowedRole) {
    setLoading(false);
    return;
  }

  loadTickets();
}, [role, allowedRole, loadTickets]);

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatus("all");
    setPriority("all");
    setCategory("all");
    setPage(1);
  };

  const handleTicketCreated = () => {
    setCreateModalOpen(false);
    setPage(1);

    if (page === 1) {
      loadTickets({ silent: true });
    }
  };

  const activeTicketCount = useMemo(
    () =>
      tickets.filter(
        (ticket) =>
          ![
            "RESOLVED",
            "CLOSED",
            "REJECTED",
          ].includes(ticket?.status)
      ).length,
    [tickets]
  );

  const resolvedTicketCount = useMemo(
    () =>
      tickets.filter((ticket) =>
        ["RESOLVED", "CLOSED"].includes(
          ticket?.status
        )
      ).length,
    [tickets]
  );

  if (!role || loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2
            size={28}
            className="animate-spin text-blue-400"
          />
          <p className="text-sm">
            Loading support tickets...
          </p>
        </div>
      </div>
    );
  }

if (
  ["SUPPORT_AGENT", "ADMIN", "SUPER_ADMIN"].includes(
    role
  )
) {
  return <StaffSupportDashboard role={role} />;
}

if (!allowedRole) {
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6">
      <div className="flex items-start gap-3">
        <AlertCircle
          size={22}
          className="mt-0.5 shrink-0 text-red-400"
        />

        <div>
          <h1 className="font-bold text-white">
            Support access unavailable
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-300">
            Your account role does not have permission to
            access this support section.
          </p>
        </div>
      </div>
    </div>
  );
}

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Support Tickets
            </h1>

            <p className="mt-1 text-sm leading-6 text-slate-400">
              Create a ticket, follow replies and track the
              current solution status.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus size={18} />
            New Ticket
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-[#1E293B] p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                <TicketCheck size={23} />
              </div>

              <div>
                <p className="text-sm text-slate-400">
                  Total Tickets
                </p>

                <p className="text-2xl font-bold text-white">
                  {pagination.total}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#1E293B] p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
                <Clock3 size={23} />
              </div>

              <div>
                <p className="text-sm text-slate-400">
                  Active on This Page
                </p>

                <p className="text-2xl font-bold text-white">
                  {activeTicketCount}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#1E293B] p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <MessageCircle size={23} />
              </div>

              <div>
                <p className="text-sm text-slate-400">
                  Solved on This Page
                </p>

                <p className="text-2xl font-bold text-white">
                  {resolvedTicketCount}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#1E293B] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <Filter size={17} />
            Search and Filters
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="relative md:col-span-2">
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSearch();
                  }
                }}
                placeholder="Search ticket number or subject..."
                className="w-full rounded-lg border border-white/10 bg-[#0F172A] py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
              />
            </div>

            <select
              value={status}
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value);
              }}
              className="rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
            >
              <option value="all">
                All Status
              </option>

              {SUPPORT_TICKET_STATUSES.map(
                (item) => (
                  <option key={item} value={item}>
                    {SUPPORT_STATUS_LABELS[item]}
                  </option>
                )
              )}
            </select>

            <select
              value={priority}
              onChange={(event) => {
                setPage(1);
                setPriority(event.target.value);
              }}
              className="rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
            >
              <option value="all">
                All Priority
              </option>

              {SUPPORT_TICKET_PRIORITIES.map(
                (item) => (
                  <option key={item} value={item}>
                    {SUPPORT_PRIORITY_LABELS[item]}
                  </option>
                )
              )}
            </select>

            <select
              value={category}
              onChange={(event) => {
                setPage(1);
                setCategory(event.target.value);
              }}
              className="rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
            >
              <option value="all">
                All Category
              </option>

              {SUPPORT_TICKET_CATEGORIES.map(
                (item) => (
                  <option key={item} value={item}>
                    {SUPPORT_CATEGORY_LABELS[item]}
                  </option>
                )
              )}
            </select>

            <button
              type="button"
              onClick={handleSearch}
              disabled={refreshing}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <Search size={16} />
              )}
              Search
            </button>
          </div>

          {(search ||
            status !== "all" ||
            priority !== "all" ||
            category !== "all") && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 cursor-pointer text-sm font-medium text-blue-400 hover:text-blue-300"
            >
              Clear all filters
            </button>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1E293B]">
          {tickets.length === 0 ? (
            <EmptyState
              onCreate={() =>
                setCreateModalOpen(true)
              }
            />
          ) : (
            <>
              {/* Mobile and tablet cards */}
              <div className="space-y-3 p-4 lg:hidden">
                {tickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                  />
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1000px] text-left text-sm">
                  <thead className="border-b border-white/10 text-slate-400">
                    <tr>
                      <th className="px-4 py-4">
                        Ticket
                      </th>

                      <th className="px-4 py-4">
                        Category
                      </th>

                      <th className="px-4 py-4">
                        Priority
                      </th>

                      <th className="px-4 py-4">
                        Status
                      </th>

                      <th className="px-4 py-4">
                        Assigned To
                      </th>

                      <th className="px-4 py-4">
                        Last Activity
                      </th>

                      <th className="px-4 py-4 text-right">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {tickets.map((ticket) => (
                      <tr
                        key={ticket.id}
                        className="border-b border-white/10 text-white last:border-b-0 hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-4">
                          <p className="font-semibold">
                            {ticket.subject}
                          </p>

                          <p className="mt-1 text-xs text-blue-400">
                            {ticket.ticketNumber}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {SUPPORT_CATEGORY_LABELS[
                            ticket.category
                          ] ||
                            ticket.category?.replaceAll(
                              "_",
                              " "
                            )}
                        </td>

                        <td className="px-4 py-4">
                          <PriorityBadge
                            priority={ticket.priority}
                          />
                        </td>

                        <td className="px-4 py-4">
                          <StatusBadge
                            status={ticket.status}
                          />
                        </td>

                        <td className="px-4 py-4">
                          <p className="text-slate-300">
                            {ticket?.assignedTo?.name ||
                              "Not assigned"}
                          </p>

                          {ticket?.escalatedTo?.name && (
                            <p className="mt-1 text-xs text-purple-400">
                              Escalated to{" "}
                              {ticket.escalatedTo.name}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4 text-slate-400">
                          {formatDate(
                            ticket.lastActivityAt
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end">
                            <Link
                              href={`/dashboard/support/${ticket.id}`}
                              className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-600"
                            >
                              <Eye size={15} />
                              View
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#1E293B] p-4 sm:flex-row">
            <p className="text-center text-sm text-slate-400 sm:text-left">
              Page {pagination.page} of{" "}
              {pagination.totalPages} — Total{" "}
              {pagination.total} ticket(s)
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || refreshing}
                onClick={() =>
                  setPage((previous) =>
                    Math.max(previous - 1, 1)
                  )
                }
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} />
                Prev
              </button>

              <span className="rounded-lg bg-[#0F172A] px-4 py-2 text-sm font-semibold text-white">
                {page}
              </span>

              <button
                type="button"
                disabled={
                  page >= pagination.totalPages ||
                  refreshing
                }
                onClick={() =>
                  setPage((previous) =>
                    Math.min(
                      previous + 1,
                      pagination.totalPages
                    )
                  )
                }
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <CreateTicketModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={handleTicketCreated}
      />
    </>
  );
}