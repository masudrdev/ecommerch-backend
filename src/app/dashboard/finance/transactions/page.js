"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { financeService } from "@/services/finance.service";

const money = (value) => `৳${Number(value || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function StatusBadge({ value }) {
  const colors = {
    COMPLETED: "border-green-500/30 bg-green-500/10 text-green-400",
    PAID: "border-green-500/30 bg-green-500/10 text-green-400",
    UNPAID: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
    PARTIALLY_PAID: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    CANCELLED: "border-red-500/30 bg-red-500/10 text-red-400",
  };
  return <span className={`rounded-full border px-3 py-1 text-xs ${colors[value] || "border-slate-500/30 bg-slate-500/10 text-slate-300"}`}>{value}</span>;
}

export default function TransactionsPage() {
  const [summary, setSummary] = useState({});
  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [type, setType] = useState("");
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [pageLoading, setPageLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);

  const fetchData = async (page = 1, firstLoad = false, filters = {}) => {
    try {
      firstLoad ? setPageLoading(true) : setTableLoading(true);
      const res = await financeService.getTransactions({ page, limit: 20, search: filters.search ?? search, vendorId: filters.vendorId ?? selectedVendorId, type: filters.type ?? type });
      setSummary(res?.summary || {});
      setOrders(res?.transactions || []);
      setVendors(res?.vendors || []);
      setPagination(res?.pagination || {});
    } catch (error) {
      console.error("Orders error", error);
    } finally {
      setPageLoading(false);
      setTableLoading(false);
    }
  };

  useEffect(() => { fetchData(1, true); }, []);
  const changePage = (page) => { if (page >= 1 && page <= pagination.totalPages) fetchData(page); };
  if (pageLoading) return <div className="text-slate-400">Loading orders...</div>;

  return <div className="space-y-6">
    <div className="flex items-center justify-between gap-4"><div><h1 className="text-3xl font-bold text-white">Orders</h1><p className="text-sm text-slate-400">View order amounts, commissions and vendor earnings.</p></div><button onClick={() => fetchData(pagination.page)} disabled={tableLoading} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><RefreshCcw size={16} className={tableLoading ? "animate-spin" : ""} /> Refresh</button></div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4"><Card title="Total Orders" value={summary.totalTransactions || 0} /><Card title="Total Amount" value={money(summary.totalAmount)} /><Card title="Vendor Earnings" value={money(summary.vendorEarnings)} /><Card title="Commission" value={money(summary.commission)} /></div>
    <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4 md:p-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-semibold text-white">Order History</h2>{tableLoading && <span className="text-sm text-blue-400">Updating...</span>}</div>
      <div className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_210px_160px_auto_auto]"><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && fetchData(1)} placeholder="Search order, customer, product or username" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white placeholder:text-slate-500" /><select value={selectedVendorId} onChange={(event) => setSelectedVendorId(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white"><option value="">All Vendors</option>{vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.username}</option>)}</select><select value={type} onChange={(event) => setType(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white"><option value="">All</option><option value="COMPLETE">Complete</option><option value="UNCOMPLETE">Uncomplete</option></select><button onClick={() => fetchData(1)} disabled={tableLoading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Search</button><button onClick={() => { setSearch(""); setSelectedVendorId(""); setType(""); fetchData(1, false, { search: "", vendorId: "", type: "" }); }} disabled={tableLoading} className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Reset</button></div>
      <div className="w-full overflow-x-auto"><table className="min-w-[1350px] w-full text-left text-sm"><thead className="border-b border-slate-700 text-slate-300"><tr><th className="py-3">Date</th><th>Order ID</th><th>Customer</th><th>Vendor Username</th><th>Product</th><th>Product Total</th><th>Commission</th><th>Vendor Earning</th><th>Payment</th><th>Order Status</th></tr></thead><tbody>{orders.map((item) => <tr key={item.id} className="border-b border-slate-700 text-white"><td className="py-3 text-slate-400">{new Date(item.date).toLocaleDateString()}</td><td><Link href={`/dashboard/orders/${item.orderId}`} className="font-semibold text-blue-400 hover:text-blue-300 hover:underline">{item.orderNumber}</Link></td><td>{item.customer}</td><td>{item.vendorUsername}</td><td>{item.product}</td><td className="font-semibold text-green-400">{money(item.amount)}</td><td className="text-blue-400">{money(item.commission)}</td><td className="font-semibold text-green-400">{money(item.vendorEarning)}</td><td><StatusBadge value={item.paymentStatus} /></td><td><StatusBadge value={item.orderStatus} /></td></tr>)}{!orders.length && <tr><td colSpan="10" className="py-8 text-center text-slate-400">No non-cancelled order items found.</td></tr>}</tbody></table></div>
      <div className="mt-5 flex items-center justify-between gap-3"><p className="text-sm text-slate-400">Page {pagination.page || 1} of {pagination.totalPages || 1}</p><div className="flex gap-2"><button disabled={pagination.page <= 1 || tableLoading} onClick={() => changePage(pagination.page - 1)} className="rounded-lg bg-slate-700 px-4 py-2 text-white disabled:opacity-50">Previous</button><button disabled={pagination.page >= pagination.totalPages || tableLoading} onClick={() => changePage(pagination.page + 1)} className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">Next</button></div></div>
    </div>
  </div>;
}

function Card({ title, value }) { return <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4 md:p-5"><p className="text-sm text-slate-400">{title}</p><h2 className="mt-2 text-2xl font-bold text-white">{value}</h2></div>; }
