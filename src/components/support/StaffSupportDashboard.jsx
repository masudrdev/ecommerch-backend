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
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock3,
  Eye,
  Filter,
  Inbox,
  Loader2,
  MessageCircle,
  RefreshCcw,
  Search,
  ShieldAlert,
  TicketCheck,
  UserCheck,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  getStaffSupportTicketsApi,
  getSupportDashboardStatsApi,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_PRIORITY_LABELS,
  SUPPORT_STATUS_LABELS,
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_TICKET_PRIORITIES,
  SUPPORT_TICKET_STATUSES,
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

const DEFAULT_STATS = {
  total: 0,
  open: 0,
  unassigned: 0,
  assignedToMe: 0,
  inProgress: 0,
  waitingForCustomer: 0,
  waitingForStaff: 0,
  escalated: 0,
  resolved: 0,
  closed: 0,
  urgent: 0,
  averageRating: 0,
  totalRatings: 0,
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

function StatCard({
  title,
  value,
  icon: Icon,
  iconClass,
  active,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full cursor-pointer rounded-xl border p-4 text-left transition sm:p-5 ${
        active
          ? "border-blue-500 bg-blue-500/10"
          : "border-white/10 bg-[#1E293B] hover:border-white/20"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon size={21} />
        </div>

        <div className="min-w-0">
          <p className="truncate text-xs text-slate-400 sm:text-sm">
            {title}
          </p>

          <p className="mt-1 text-xl font-bold text-white sm:text-2xl">
            {value || 0}
          </p>
        </div>
      </div>
    </button>
  );
}

function TicketMobileCard({ ticket }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0F172A] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-blue-400">
            {ticket.ticketNumber}
          </p>

          <h3 className="mt-1 break-words font-semibold text-white">
            {ticket.subject}
          </h3>
        </div>

        <PriorityBadge priority={ticket.priority} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <StatusBadge status={ticket.status} />

        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
          {SUPPORT_CATEGORY_LABELS[ticket.category] ||
            ticket.category?.replaceAll("_", " ")}
        </span>
      </div>

      <div className="mt-4 space-y-2 border-t border-white/10 pt-3 text-xs text-slate-400">
        <p>
          Created by:{" "}
          <span className="text-slate-200">
            {ticket?.user?.name ||
              ticket?.user?.username ||
              "Unknown user"}
          </span>
        </p>

        <p>
          Role:{" "}
          <span className="text-slate-200">
            {ticket?.user?.role || "-"}
          </span>
        </p>

        <p>
          Assigned to:{" "}
          <span className="text-slate-200">
            {ticket?.assignedTo?.name || "Unassigned"}
          </span>
        </p>

        <p>
          Updated:{" "}
          <span className="text-slate-200">
            {formatDate(ticket.lastActivityAt)}
          </span>
        </p>
      </div>

      {ticket?.escalatedTo?.name && (
        <div className="mt-3 rounded-lg border border-purple-500/20 bg-purple-500/10 px-3 py-2 text-xs text-purple-300">
          Escalated to {ticket.escalatedTo.name}
        </div>
      )}

      <Link
        href={`/dashboard/support/${ticket.id}`}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        <Eye size={16} />
        Open Ticket
      </Link>
    </div>
  );
}

export default function StaffSupportDashboard({ role }) {
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [tickets, setTickets] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [searchInput, setSearchInput] =
    useState("");
  const [search, setSearch] = useState("");

  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [category, setCategory] = useState("all");
  const [assigned, setAssigned] = useState("all");
  const [createdByRole, setCreatedByRole] =
    useState("all");

  const [page, setPage] = useState(1);
  const limit = 20;

  const [pagination, setPagination] = useState({
    page: 1,
    limit,
    total: 0,
    totalPages: 1,
  });

  const isSupportAgent = role === "SUPPORT_AGENT";

  const loadDashboard = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const [statsResult, ticketsResult] =
          await Promise.all([
            getSupportDashboardStatsApi(),
            getStaffSupportTicketsApi({
              page,
              limit,
              search,
              status,
              priority,
              category,
              assigned,
              createdByRole,
            }),
          ]);

        setStats(statsResult?.stats || DEFAULT_STATS);

        setTickets(
          Array.isArray(ticketsResult?.tickets)
            ? ticketsResult.tickets
            : []
        );

        setPagination(
          ticketsResult?.pagination || {
            page,
            limit,
            total: 0,
            totalPages: 1,
          }
        );
      } catch (error) {
        console.error(
          "Staff support dashboard error:",
          error?.response?.data || error
        );

        toast.error(
          getErrorMessage(
            error,
            "Failed to load support dashboard"
          )
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      page,
      search,
      status,
      priority,
      category,
      assigned,
      createdByRole,
    ]
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const applyQuickFilter = (type) => {
    setPage(1);
    setStatus("all");
    setAssigned("all");

    if (type === "all") return;

    if (type === "unassigned") {
      setAssigned("unassigned");
      return;
    }

    if (type === "me") {
      setAssigned("me");
      return;
    }

    setStatus(type);
  };

  const activeQuickFilter = useMemo(() => {
    if (assigned === "unassigned") return "unassigned";
    if (assigned === "me") return "me";
    if (status !== "all") return status;

    return "all";
  }, [assigned, status]);

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
    setAssigned("all");
    setCreatedByRole("all");
    setPage(1);
  };

  const hasFilters =
    search ||
    status !== "all" ||
    priority !== "all" ||
    category !== "all" ||
    assigned !== "all" ||
    createdByRole !== "all";

  if (loading) {
    return (
      <div className="flex min-h-[450px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2
            size={30}
            className="animate-spin text-blue-400"
          />

          <p className="text-sm">
            Loading staff support dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">
            {role.replaceAll("_", " ")}
          </p>

          <h1 className="mt-1 text-2xl font-bold text-white">
            Support Dashboard
          </h1>

          <p className="mt-1 text-sm leading-6 text-slate-400">
            Review customer and vendor tickets, reply,
            assign, resolve or escalate issues.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            loadDashboard({ silent: true })
          }
          disabled={refreshing}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw
            size={16}
            className={refreshing ? "animate-spin" : ""}
          />

          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
        <StatCard
          title="Total Tickets"
          value={stats.total}
          icon={TicketCheck}
          iconClass="bg-blue-500/10 text-blue-400"
          active={activeQuickFilter === "all"}
          onClick={() => applyQuickFilter("all")}
        />

        <StatCard
          title="Unassigned"
          value={stats.unassigned}
          icon={Inbox}
          iconClass="bg-cyan-500/10 text-cyan-400"
          active={activeQuickFilter === "unassigned"}
          onClick={() =>
            applyQuickFilter("unassigned")
          }
        />

        <StatCard
          title="Assigned to Me"
          value={stats.assignedToMe}
          icon={UserCheck}
          iconClass="bg-indigo-500/10 text-indigo-400"
          active={activeQuickFilter === "me"}
          onClick={() => applyQuickFilter("me")}
        />

        <StatCard
          title="In Progress"
          value={stats.inProgress}
          icon={CircleDot}
          iconClass="bg-orange-500/10 text-orange-400"
          active={
            activeQuickFilter === "IN_PROGRESS"
          }
          onClick={() =>
            applyQuickFilter("IN_PROGRESS")
          }
        />

        <StatCard
          title="Escalated"
          value={stats.escalated}
          icon={ShieldAlert}
          iconClass="bg-purple-500/10 text-purple-400"
          active={activeQuickFilter === "ESCALATED"}
          onClick={() =>
            applyQuickFilter("ESCALATED")
          }
        />

        <StatCard
          title="Resolved"
          value={stats.resolved}
          icon={CheckCircle2}
          iconClass="bg-emerald-500/10 text-emerald-400"
          active={activeQuickFilter === "RESOLVED"}
          onClick={() =>
            applyQuickFilter("RESOLVED")
          }
        />
      </div>

      {stats.urgent > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
          <AlertTriangle
            size={21}
            className="mt-0.5 shrink-0 text-red-400"
          />

          <div>
            <p className="font-semibold text-white">
              {stats.urgent} urgent ticket
              {stats.urgent > 1 ? "s" : ""} need
              attention
            </p>

            <button
              type="button"
              onClick={() => {
                setPage(1);
                setPriority("URGENT");
              }}
              className="mt-1 cursor-pointer text-sm font-medium text-red-300 hover:text-red-200"
            >
              Show urgent tickets
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-[#1E293B] p-4">
        <div className="mb-3 flex items-center gap-2 font-semibold text-white">
          <Filter size={17} />
          Search and Filters
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
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
              placeholder="Ticket number, subject, user or email..."
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
            <option value="all">All Status</option>

            {SUPPORT_TICKET_STATUSES.map((item) => (
              <option key={item} value={item}>
                {SUPPORT_STATUS_LABELS[item]}
              </option>
            ))}
          </select>

          <select
            value={priority}
            onChange={(event) => {
              setPage(1);
              setPriority(event.target.value);
            }}
            className="rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
          >
            <option value="all">All Priority</option>

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
            <option value="all">All Category</option>

            {SUPPORT_TICKET_CATEGORIES.map(
              (item) => (
                <option key={item} value={item}>
                  {SUPPORT_CATEGORY_LABELS[item]}
                </option>
              )
            )}
          </select>

          <select
            value={assigned}
            onChange={(event) => {
              setPage(1);
              setAssigned(event.target.value);
            }}
            className="rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
          >
            <option value="all">
              All Assignments
            </option>
            <option value="unassigned">
              Unassigned
            </option>
            <option value="me">Assigned to Me</option>
          </select>

          <select
            value={createdByRole}
            onChange={(event) => {
              setPage(1);
              setCreatedByRole(event.target.value);
            }}
            className="rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
          >
            <option value="all">All Users</option>
            <option value="CUSTOMER">Customers</option>
            <option value="VENDOR">Vendors</option>
          </select>
        </div>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleSearch}
            disabled={refreshing}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            <Search size={16} />
            Search
          </button>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="cursor-pointer rounded-lg bg-slate-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-600"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1E293B]">
        {tickets.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center">
            <Inbox
              size={40}
              className="text-slate-600"
            />

            <h2 className="mt-4 font-bold text-white">
              No tickets found
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              No support tickets match the selected
              filters.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3 p-4 lg:hidden">
              {tickets.map((ticket) => (
                <TicketMobileCard
                  key={ticket.id}
                  ticket={ticket}
                />
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1150px] text-left text-sm">
                <thead className="border-b border-white/10 text-slate-400">
                  <tr>
                    <th className="px-4 py-4">
                      Ticket
                    </th>
                    <th className="px-4 py-4">
                      Created By
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
                      Assigned
                    </th>
                    <th className="px-4 py-4">
                      Updated
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
                        <p className="max-w-[230px] truncate font-semibold">
                          {ticket.subject}
                        </p>

                        <p className="mt-1 text-xs text-blue-400">
                          {ticket.ticketNumber}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-200">
                          {ticket?.user?.name ||
                            ticket?.user?.username ||
                            "Unknown"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {ticket?.user?.role}
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
                            "Unassigned"}
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
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                          >
                            <Eye size={15} />
                            Open
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
          <p className="text-sm text-slate-400">
            Page {pagination.page} of{" "}
            {pagination.totalPages} —{" "}
            {pagination.total} ticket(s)
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || refreshing}
              onClick={() =>
                setPage((current) =>
                  Math.max(current - 1, 1)
                )
              }
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
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
                setPage((current) =>
                  Math.min(
                    current + 1,
                    pagination.totalPages
                  )
                )
              }
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {isSupportAgent && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
          <div className="flex items-start gap-3">
            <Users
              size={20}
              className="mt-0.5 shrink-0 text-blue-400"
            />

            <p className="text-sm leading-6 text-slate-300">
              As a Support Agent, you can claim tickets,
              reply, add internal notes, change status and
              priority, and escalate issues to Admin or
              Super Admin.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}