"use client";

import { useEffect, useState } from "react";

import {
  CheckCircle,
  CreditCard,
  RefreshCcw,
  Loader2,
  Wallet,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { payoutService } from "@/services/payout.service";

const money = (value) =>
  `৳${Number(value || 0).toLocaleString("en-BD")}`;

function StatusBadge({ status }) {
  const colors = {
    PENDING:
      "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",

    APPROVED:
      "bg-blue-500/10 text-blue-400 border-blue-500/20",

    PAID:
      "bg-green-500/10 text-green-400 border-green-500/20",

    REJECTED:
      "bg-red-500/10 text-red-400 border-red-500/20",

    CANCELLED:
      "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold ${
        colors[status] ||
        "bg-slate-500/10 text-slate-400"
      }`}
    >
      {status}
    </span>
  );
}

export default function PayoutApprovalsPage() {
  const [summary, setSummary] = useState(null);

  const [payouts, setPayouts] = useState([]);

  const [vendors, setVendors] = useState([]);

  const [loading, setLoading] = useState(true);

  const [actionLoading, setActionLoading] =
    useState("");

  /*
   * ==========================================
   * FILTERS
   * ==========================================
   */

  const [search, setSearch] = useState("");

  const [vendorId, setVendorId] =
    useState("ALL");

  const [status, setStatus] =
    useState("ALL");

  const [paymentMethod, setPaymentMethod] =
    useState("ALL");

  const [dateFrom, setDateFrom] =
    useState("");

  const [dateTo, setDateTo] =
    useState("");

  /*
   * ==========================================
   * PAGINATION
   * ==========================================
   */

  const [page, setPage] = useState(1);

  const [limit] = useState(10);

  const [pagination, setPagination] =
    useState(null);

  /*
   * ==========================================
   * LOAD DATA
   * ==========================================
   */

  const loadData = async (
    customPage = page
  ) => {
    try {
      setLoading(true);

      const response =
        await payoutService.getAllPayouts({
          search: search.trim() || undefined,

          vendorId:
            vendorId !== "ALL"
              ? vendorId
              : undefined,

          status:
            status !== "ALL"
              ? status
              : undefined,

          paymentMethod:
            paymentMethod !== "ALL"
              ? paymentMethod
              : undefined,

          dateFrom:
            dateFrom || undefined,

          dateTo:
            dateTo || undefined,

          page: customPage,

          limit,
        });

      setPayouts(
        response?.payouts || []
      );

      setSummary(
        response?.summary || null
      );

      setVendors(
        response?.vendors || []
      );

      setPagination(
        response?.pagination || null
      );
    } catch (error) {
      console.error(
        "Payout load error:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * Initial load
   */

  useEffect(() => {
    loadData(1);
  }, []);

  /*
   * ==========================================
   * SEARCH / FILTER
   * ==========================================
   */

  const applyFilters = () => {
    setPage(1);

    loadData(1);
  };

  /*
   * ==========================================
   * RESET
   * ==========================================
   */

  const resetFilters = () => {
    setSearch("");

    setVendorId("ALL");

    setStatus("ALL");

    setPaymentMethod("ALL");

    setDateFrom("");

    setDateTo("");

    setPage(1);

    /*
     * সরাসরি clean params দিয়ে load
     */

    loadCleanData();
  };

  const loadCleanData = async () => {
    try {
      setLoading(true);

      const response =
        await payoutService.getAllPayouts({
          page: 1,
          limit,
        });

      setPayouts(
        response?.payouts || []
      );

      setSummary(
        response?.summary || null
      );

      setVendors(
        response?.vendors || []
      );

      setPagination(
        response?.pagination || null
      );
    } catch (error) {
      console.error(
        "Reset payout load error:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ==========================================
   * PAGINATION
   * ==========================================
   */

  const goToPage = (newPage) => {
    if (
      newPage < 1 ||
      newPage >
        (pagination?.totalPages || 1)
    ) {
      return;
    }

    setPage(newPage);

    loadData(newPage);
  };

  /*
   * ==========================================
   * APPROVE
   * ==========================================
   */

  const approve = async (id) => {
    try {
      setActionLoading(id);

      await payoutService.approvePayout(
        id,
        {
          adminNote:
            "Approved by admin",
        }
      );

      await loadData(page);
    } catch (error) {
      console.error(
        "Approve payout error:",
        error
      );
    } finally {
      setActionLoading("");
    }
  };

  /*
   * ==========================================
   * REJECT
   * ==========================================
   */

  const reject = async (id) => {
    const reason =
      window.prompt(
        "Enter rejection reason"
      );

    if (!reason?.trim()) {
      return;
    }

    try {
      setActionLoading(id);

      await payoutService.rejectPayout(
        id,
        {
          rejectionReason:
            reason.trim(),

          adminNote:
            "Rejected by admin",
        }
      );

      await loadData(page);
    } catch (error) {
      console.error(
        "Reject payout error:",
        error
      );
    } finally {
      setActionLoading("");
    }
  };

  /*
   * ==========================================
   * MARK PAID
   * ==========================================
   */

  const markPaid = async (id) => {
    const transactionId =
      window.prompt(
        "Enter transaction ID"
      );

    if (!transactionId?.trim()) {
      return;
    }

    try {
      setActionLoading(id);

      await payoutService.markPayoutPaid(
        id,
        {
          transactionId:
            transactionId.trim(),
        }
      );

      await loadData(page);
    } catch (error) {
      console.error(
        "Mark paid error:",
        error
      );
    } finally {
      setActionLoading("");
    }
  };

  /*
   * ==========================================
   * LOADING
   * ==========================================
   */

  if (loading && !summary) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2
          className="animate-spin text-blue-500"
          size={30}
        />
      </div>
    );
  }

  /*
   * ==========================================
   * UI
   * ==========================================
   */

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Payout Approvals
          </h1>

          <p className="text-sm text-slate-400">
            Manage vendor withdrawal requests
          </p>
        </div>

        <button
          onClick={() =>
            loadData(page)
          }
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-white hover:bg-slate-600 disabled:opacity-50"
        >
          <RefreshCcw
            size={17}
            className={
              loading
                ? "animate-spin"
                : ""
            }
          />

          Refresh
        </button>
      </div>

      {/* FILTERS */}

      <div className="rounded-xl bg-[#1E293B] p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* SEARCH */}

          <div className="lg:col-span-2">
            <label className="mb-2 block text-xs font-medium text-slate-400">
              Search
            </label>

            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    applyFilters();
                  }
                }}
                placeholder="Request ID, vendor, email, account, transaction ID..."
                className="w-full rounded-lg border border-white/10 bg-[#0F172A] py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* VENDOR */}

          <div>
            <label className="mb-2 block text-xs font-medium text-slate-400">
              Vendor
            </label>

            <select
              value={vendorId}
              onChange={(e) =>
                setVendorId(e.target.value)
              }
              className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
            >
              <option value="ALL">
                All Vendors
              </option>

              {vendors.map((vendor) => (
                <option
                  key={vendor.id}
                  value={vendor.id}
                >
                  {vendor.shopName}
                </option>
              ))}
            </select>
          </div>

          {/* STATUS */}

          <div>
            <label className="mb-2 block text-xs font-medium text-slate-400">
              Status
            </label>

            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value)
              }
              className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
            >
              <option value="ALL">
                All Status
              </option>

              <option value="PENDING">
                Pending
              </option>

              <option value="APPROVED">
                Approved
              </option>

              <option value="PAID">
                Paid
              </option>

              <option value="REJECTED">
                Rejected
              </option>

              <option value="CANCELLED">
                Cancelled
              </option>
            </select>
          </div>

          {/* PAYMENT METHOD */}

          <div>
            <label className="mb-2 block text-xs font-medium text-slate-400">
              Payment Method
            </label>

            <select
              value={paymentMethod}
              onChange={(e) =>
                setPaymentMethod(
                  e.target.value
                )
              }
              className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
            >
              <option value="ALL">
                All Methods
              </option>

              <option value="BKASH">
                BKASH
              </option>

              <option value="NAGAD">
                NAGAD
              </option>

              <option value="BANK">
                BANK
              </option>

              <option value="ROCKET">
                ROCKET
              </option>
            </select>
          </div>

          {/* FROM DATE */}

          <div>
            <label className="mb-2 block text-xs font-medium text-slate-400">
              From Date
            </label>

            <input
              type="date"
              value={dateFrom}
              onChange={(e) =>
                setDateFrom(e.target.value)
              }
              className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
            />
          </div>

          {/* TO DATE */}

          <div>
            <label className="mb-2 block text-xs font-medium text-slate-400">
              To Date
            </label>

            <input
              type="date"
              value={dateTo}
              onChange={(e) =>
                setDateTo(e.target.value)
              }
              className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
            />
          </div>

          {/* BUTTONS */}

          <div className="flex items-end gap-2 lg:col-span-2">
            <button
              onClick={applyFilters}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
            >
              <Search size={16} />

              Apply Filters
            </button>

            <button
              onClick={resetFilters}
              className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-slate-700 px-4 py-2.5 text-sm text-white hover:bg-slate-600"
            >
              <X size={16} />

              Reset
            </button>
          </div>
        </div>
      </div>

      {/* SUMMARY CARDS */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {/* AVAILABLE */}

        <div className="rounded-xl bg-[#1E293B] p-5">
          <Wallet className="text-blue-400" />

          <p className="mt-3 text-slate-400">
            Vendor Available
          </p>

          <h2 className="text-2xl font-bold text-white">
            {money(
              summary?.vendorAvailableBalance
            )}
          </h2>
        </div>

        {/* PENDING */}

        <div className="rounded-xl bg-[#1E293B] p-5">
          <CreditCard className="text-yellow-400" />

          <p className="mt-3 text-slate-400">
            Pending Payout
          </p>

          <h2 className="text-2xl font-bold text-white">
            {money(
              summary?.pendingPayout
                ?.amount
            )}
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            {summary?.pendingPayout
              ?.count || 0}{" "}
            request(s)
          </p>
        </div>

        {/* PAID */}

        <div className="rounded-xl bg-[#1E293B] p-5">
          <CheckCircle className="text-green-400" />

          <p className="mt-3 text-slate-400">
            Paid Payout
          </p>

          <h2 className="text-2xl font-bold text-white">
            {money(
              summary?.paidPayout?.amount
            )}
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            {summary?.paidPayout?.count ||
              0}{" "}
            request(s)
          </p>
        </div>

        {/* COMMISSION */}

        <div className="rounded-xl bg-[#1E293B] p-5">
          <CreditCard className="text-purple-400" />

          <p className="mt-3 text-slate-400">
            Platform Commission
          </p>

          <h2 className="text-2xl font-bold text-white">
            {money(
              summary?.platformCommission
            )}
          </h2>
        </div>
      </div>

      {/* TABLE */}

      <div className="overflow-x-auto rounded-xl bg-[#1E293B] p-5">
        <table className="w-full min-w-[1200px]">
          <thead>
            <tr className="border-b border-white/10 text-slate-400">
              <th className="p-3 text-left">
                Request
              </th>

              <th className="p-3 text-left">
                Vendor
              </th>

              <th className="p-3 text-left">
                Amount
              </th>

              <th className="p-3 text-left">
                Payment
              </th>

              <th className="p-3 text-left">
                Account
              </th>

              <th className="p-3 text-left">
                Transaction ID
              </th>

              <th className="p-3 text-left">
                Status
              </th>

              <th className="p-3 text-left">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {payouts.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="p-10 text-center text-slate-500"
                >
                  No payout requests found.
                </td>
              </tr>
            ) : (
              payouts.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-white/10 text-white"
                >
                  {/* REQUEST */}

                  <td className="p-3">
                    <p className="max-w-[170px] truncate font-mono text-sm text-blue-400">
                      #{item.id}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {item.createdAt
                        ? new Date(
                            item.createdAt
                          ).toLocaleString(
                            "en-BD"
                          )
                        : "-"}
                    </p>
                  </td>

                  {/* VENDOR */}

                  <td className="p-3">
                    <p className="font-bold">
                      {item.vendor?.shopName ||
                        "-"}
                    </p>

                    <p className="text-xs text-slate-400">
                      {item.vendor?.user
                        ?.email || "-"}
                    </p>
                  </td>

                  {/* AMOUNT */}

                  <td className="p-3 font-bold text-blue-400">
                    {money(item.amount)}
                  </td>

                  {/* PAYMENT */}

                  <td className="p-3">
                    {item.paymentMethod ||
                      "-"}
                  </td>

                  {/* ACCOUNT */}

                  <td className="p-3">
                    {item.accountNumber ||
                      "-"}
                  </td>

                  {/* TRANSACTION */}

                  <td className="p-3">
                    {item.transactionId ? (
                      <span className="font-mono text-xs text-green-400">
                        {item.transactionId}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">
                        Not available
                      </span>
                    )}
                  </td>

                  {/* STATUS */}

                  <td className="p-3">
                    <StatusBadge
                      status={item.status}
                    />
                  </td>

                  {/* ACTION */}

                  <td className="p-3">
                    <div className="flex gap-2">
                      {item.status ===
                        "PENDING" && (
                        <>
                          <button
                            disabled={
                              actionLoading ===
                              item.id
                            }
                            onClick={() =>
                              approve(
                                item.id
                              )
                            }
                            className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold hover:bg-green-500 disabled:opacity-50"
                          >
                            {actionLoading ===
                            item.id
                              ? "..."
                              : "Approve"}
                          </button>

                          <button
                            disabled={
                              actionLoading ===
                              item.id
                            }
                            onClick={() =>
                              reject(
                                item.id
                              )
                            }
                            className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold hover:bg-red-500 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {item.status ===
                        "APPROVED" && (
                        <button
                          disabled={
                            actionLoading ===
                            item.id
                          }
                          onClick={() =>
                            markPaid(
                              item.id
                            )
                          }
                          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold hover:bg-blue-500 disabled:opacity-50"
                        >
                          {actionLoading ===
                          item.id
                            ? "..."
                            : "Mark Paid"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}

      {pagination &&
        pagination.total > 0 && (
          <div className="flex flex-col gap-4 rounded-xl bg-[#1E293B] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-400">
              Showing{" "}
              <span className="font-semibold text-white">
                {Math.min(
                  (pagination.page - 1) *
                    pagination.limit +
                    1,
                  pagination.total
                )}
              </span>{" "}
              -{" "}
              <span className="font-semibold text-white">
                {Math.min(
                  pagination.page *
                    pagination.limit,
                  pagination.total
                )}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-white">
                {pagination.total}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={
                  !pagination.hasPreviousPage ||
                  loading
                }
                onClick={() =>
                  goToPage(
                    pagination.page - 1
                  )
                }
                className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-700 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} />

                Previous
              </button>

              <span className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                {pagination.page} /{" "}
                {pagination.totalPages}
              </span>

              <button
                disabled={
                  !pagination.hasNextPage ||
                  loading
                }
                onClick={() =>
                  goToPage(
                    pagination.page + 1
                  )
                }
                className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-700 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next

                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
    </div>
  );
}