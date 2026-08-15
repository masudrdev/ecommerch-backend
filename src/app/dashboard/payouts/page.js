"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CircleDollarSign,
  Clock3,
  Loader2,
  RefreshCcw,
  Send,
  Wallet,
  X,
} from "lucide-react";

import { payoutService } from "@/services/payout.service";

const EMPTY_FORM = {
  amount: "",
  paymentMethod: "BKASH",
  accountName: "",
  accountNumber: "",
  note: "",
};

function money(value) {
  return `৳${Number(value || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return "-";

  return new Date(value).toLocaleString("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function StatusBadge({ status }) {
  const normalizedStatus = String(status || "PENDING").toUpperCase();

  const classes = {
    PENDING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    APPROVED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    PAID: "bg-green-500/10 text-green-400 border-green-500/20",
    REJECTED: "bg-red-500/10 text-red-400 border-red-500/20",
    CANCELLED: "bg-slate-500/10 text-slate-300 border-slate-500/20",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
        classes[normalizedStatus] ||
        "border-slate-500/20 bg-slate-500/10 text-slate-300"
      }`}
    >
      {normalizedStatus}
    </span>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClass,
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#1E293B] p-5">
      <div className="flex items-center gap-4">
        <div className={`rounded-xl p-3 ${iconClass}`}>
          <Icon size={24} />
        </div>

        <div className="min-w-0">
          <p className="text-sm text-slate-400">{title}</p>

          <h3 className="truncate text-2xl font-bold text-white">
            {value}
          </h3>

          {subtitle && (
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function PageLoading() {
  return (
    <div className="flex min-h-[350px] items-center justify-center">
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#1E293B] px-6 py-4 text-white">
        <Loader2 size={22} className="animate-spin text-blue-500" />
        <span className="text-sm font-semibold">
          Loading payout information...
        </span>
      </div>
    </div>
  );
}

export default function VendorPayoutsPage() {
  const [summary, setSummary] = useState(null);
  const [payouts, setPayouts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState("");

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const availableBalance = Number(summary?.availableBalance || 0);
  const minimumPayoutAmount = Number(
    summary?.minimumPayoutAmount || 100
  );

  const canRequestPayout =
    availableBalance >= minimumPayoutAmount && !submitting;

  const pendingPayoutCount = useMemo(
    () =>
      payouts.filter(
        (payout) => String(payout.status).toUpperCase() === "PENDING"
      ).length,
    [payouts]
  );

  const fetchPayoutData = useCallback(async ({ refresh = false } = {}) => {
    try {
      setErrorMessage("");

      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [summaryResponse, requestsResponse] = await Promise.all([
        payoutService.getMySummary(),
        payoutService.getMyRequests(),
      ]);

      setSummary(summaryResponse?.summary || null);

      setPayouts(
        Array.isArray(requestsResponse?.payouts)
          ? requestsResponse.payouts
          : []
      );
    } catch (error) {
      console.error(
        "Payout page fetch error:",
        error?.response?.data || error
      );

      setSummary(null);
      setPayouts([]);

      setErrorMessage(
        error?.response?.data?.message ||
          "Failed to load payout information"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPayoutData();
  }, [fetchPayoutData]);

  const openRequestModal = () => {
    setErrorMessage("");
    setSuccessMessage("");
    setForm(EMPTY_FORM);
    setShowRequestModal(true);
  };

  const closeRequestModal = () => {
    if (submitting) return;

    setShowRequestModal(false);
    setForm(EMPTY_FORM);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleRequestPayout = async (event) => {
    event.preventDefault();

    const amount = Number(form.amount);

    setErrorMessage("");
    setSuccessMessage("");

    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMessage("Enter a valid payout amount");
      return;
    }

    if (amount < minimumPayoutAmount) {
      setErrorMessage(
        `Minimum payout amount is ${money(minimumPayoutAmount)}`
      );
      return;
    }

    if (amount > availableBalance) {
      setErrorMessage("Payout amount exceeds your available balance");
      return;
    }

    if (!form.accountNumber.trim()) {
      setErrorMessage("Account number is required");
      return;
    }

    try {
      setSubmitting(true);

      const response = await payoutService.requestPayout({
        amount,
        paymentMethod: form.paymentMethod,
        accountName: form.accountName.trim(),
        accountNumber: form.accountNumber.trim(),
        note: form.note.trim(),
      });

      setSuccessMessage(
        response?.message || "Payout request submitted successfully"
      );

      setShowRequestModal(false);
      setForm(EMPTY_FORM);

      await fetchPayoutData({ refresh: true });
    } catch (error) {
      console.error(
        "Payout request error:",
        error?.response?.data || error
      );

      setErrorMessage(
        error?.response?.data?.message ||
          "Failed to submit payout request"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelPayout = async (payout) => {
    const confirmed = window.confirm(
      `Cancel payout request of ${money(payout.amount)}? The amount will return to your available balance.`
    );

    if (!confirmed) return;

    try {
      setCancellingId(payout.id);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await payoutService.cancelPayout(payout.id);

      setSuccessMessage(
        response?.message ||
          "Payout cancelled and balance returned successfully"
      );

      await fetchPayoutData({ refresh: true });
    } catch (error) {
      console.error(
        "Cancel payout error:",
        error?.response?.data || error
      );

      setErrorMessage(
        error?.response?.data?.message ||
          "Failed to cancel payout request"
      );
    } finally {
      setCancellingId("");
    }
  };

  if (loading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Vendor Payouts
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            Request withdrawals and view your payout history.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => fetchPayoutData({ refresh: true })}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#1E293B] px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw
              size={17}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={openRequestModal}
            disabled={!canRequestPayout}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={17} />
            Request Payout
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-300">
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Available Balance"
          value={money(summary?.availableBalance)}
          subtitle="Ready to withdraw"
          icon={Wallet}
          iconClass="bg-blue-600/20 text-blue-400"
        />

        <SummaryCard
          title="Pending Payout"
          value={money(summary?.pendingAmount)}
          subtitle={`${pendingPayoutCount} pending request(s)`}
          icon={Clock3}
          iconClass="bg-yellow-600/20 text-yellow-400"
        />

        <SummaryCard
          title="Approved Amount"
          value={money(summary?.approvedAmount)}
          subtitle="Approved but not paid"
          icon={CircleDollarSign}
          iconClass="bg-purple-600/20 text-purple-400"
        />

        <SummaryCard
          title="Total Withdrawn"
          value={money(summary?.totalWithdrawn)}
          subtitle="Successfully paid"
          icon={Banknote}
          iconClass="bg-green-600/20 text-green-400"
        />
      </div>

      <div className="rounded-xl border border-white/10 bg-[#1E293B] p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">
              Payout History
            </h2>

            <p className="text-sm text-slate-400">
              Minimum payout amount: {money(minimumPayoutAmount)}
            </p>
          </div>

          <p className="text-sm text-slate-400">
            {payouts.length} request(s)
          </p>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="border-b border-white/10 text-slate-400">
              <tr>
                <th className="px-3 py-4">Request</th>
                <th className="px-3 py-4">Amount</th>
                <th className="px-3 py-4">Payment Method</th>
                <th className="px-3 py-4">Account</th>
                <th className="px-3 py-4">Status</th>
                <th className="px-3 py-4">Date</th>
                <th className="px-3 py-4">Note</th>
                <th className="px-3 py-4 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {payouts.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-12 text-center text-slate-400"
                  >
                    No payout requests found.
                  </td>
                </tr>
              ) : (
                payouts.map((payout) => {
                  const isPending =
                    String(payout.status).toUpperCase() === "PENDING";

                  return (
                    <tr
                      key={payout.id}
                      className="border-b border-white/10 text-white last:border-b-0 hover:bg-white/[0.02]"
                    >
                      <td className="px-3 py-4">
                        <p className="font-semibold">
                          #{String(payout.id).slice(0, 8)}
                        </p>

                        {payout.transactionId && (
                          <p className="mt-1 text-xs text-slate-400">
                            TXN: {payout.transactionId}
                          </p>
                        )}
                      </td>

                      <td className="px-3 py-4 font-bold text-blue-400">
                        {money(payout.amount)}
                      </td>

                      <td className="px-3 py-4">
                        {payout.paymentMethod || "-"}
                      </td>

                      <td className="px-3 py-4">
                        <p>{payout.accountName || "-"}</p>
                        <p className="text-xs text-slate-400">
                          {payout.accountNumber || "-"}
                        </p>
                      </td>

                      <td className="px-3 py-4">
                        <StatusBadge status={payout.status} />
                      </td>

                      <td className="px-3 py-4 text-slate-300">
                        {formatDate(payout.createdAt)}
                      </td>

                      <td className="max-w-[220px] px-3 py-4">
                        <p className="truncate text-slate-300">
                          {payout.vendorNote || "-"}
                        </p>

                        {payout.rejectionReason && (
                          <p className="mt-1 text-xs text-red-400">
                            Rejected: {payout.rejectionReason}
                          </p>
                        )}

                        {payout.adminNote && (
                          <p className="mt-1 text-xs text-slate-400">
                            Admin: {payout.adminNote}
                          </p>
                        )}
                      </td>

                      <td className="px-3 py-4 text-right">
                        {isPending ? (
                          <button
                            type="button"
                            onClick={() => handleCancelPayout(payout)}
                            disabled={cancellingId === payout.id}
                            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {cancellingId === payout.id ? (
                              <Loader2
                                size={14}
                                className="animate-spin"
                              />
                            ) : (
                              <X size={14} />
                            )}

                            Cancel
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">
                            No action
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showRequestModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[95vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-[#1E293B] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Request Payout
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Available balance: {money(availableBalance)}
                </p>
              </div>

              <button
                type="button"
                onClick={closeRequestModal}
                disabled={submitting}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleRequestPayout}
              className="space-y-5 p-5"
            >
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  Amount
                </label>

                <input
                  type="number"
                  name="amount"
                  min={minimumPayoutAmount}
                  max={availableBalance}
                  step="0.01"
                  value={form.amount}
                  onChange={handleInputChange}
                  placeholder={`Minimum ${money(minimumPayoutAmount)}`}
                  className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-blue-500"
                />

                <div className="mt-2 flex flex-wrap gap-2">
                  {[500, 1000, 5000].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      disabled={amount > availableBalance}
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          amount: String(amount),
                        }))
                      }
                      className="rounded-lg border border-white/10 bg-[#0F172A] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-blue-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {money(amount)}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        amount: String(availableBalance),
                      }))
                    }
                    className="rounded-lg border border-white/10 bg-[#0F172A] px-3 py-1.5 text-xs font-semibold text-blue-400 hover:border-blue-500"
                  >
                    Full Balance
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  Payment Method
                </label>

                <select
                  name="paymentMethod"
                  value={form.paymentMethod}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-blue-500"
                >
                  <option value="BKASH">bKash</option>
                  <option value="NAGAD">Nagad</option>
                  <option value="ROCKET">Rocket</option>
                  <option value="BANK">Bank Transfer</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  Account Name
                </label>

                <input
                  type="text"
                  name="accountName"
                  value={form.accountName}
                  onChange={handleInputChange}
                  placeholder="Account holder name"
                  className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  Account Number
                </label>

                <input
                  type="text"
                  name="accountNumber"
                  value={form.accountNumber}
                  onChange={handleInputChange}
                  placeholder="Enter account or mobile number"
                  className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  Note
                </label>

                <textarea
                  name="note"
                  rows={3}
                  value={form.note}
                  onChange={handleInputChange}
                  placeholder="Optional payout note"
                  className="w-full resize-none rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-200">
                The requested amount will be deducted from your available
                balance immediately. If the request is rejected or cancelled,
                the amount will be returned automatically.
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeRequestModal}
                  disabled={submitting}
                  className="rounded-lg bg-slate-700 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-600 disabled:opacity-50"
                >
                  Close
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={17} />
                      Submit Request
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}