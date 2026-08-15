"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BadgeDollarSign,
  Eye,
  Loader2,
  Search,
  ShoppingCart,
  Wallet,
} from "lucide-react";

import api from "@/lib/axios";
import { vendorService } from "@/services/vendor.service";
import { getLoggedInUserRole } from "@/services/orderDetails.service";

function money(value) {
  return `৳${Number(value || 0).toLocaleString("en-BD")}`;
}

function getOrderImage(order) {
  const image =
    order?.image ||
    order?.products?.[0]?.image ||
    order?.items?.[0]?.product?.images?.[0]?.url ||
    order?.items?.[0]?.product?.images?.[0] ||
    null;

  return typeof image === "string" && image.trim() ? image : null;
}

function StatusBadge({ status }) {
  const normalizedStatus = String(status || "N/A").toUpperCase();

  const style = {
    PENDING: "bg-yellow-500/10 text-yellow-400",
    CONFIRMED: "bg-cyan-500/10 text-cyan-400",
    PARTIALLY_CONFIRMED: "bg-cyan-500/10 text-cyan-400",
    PROCESSING: "bg-blue-500/10 text-blue-400",
    PARTIALLY_PROCESSING: "bg-blue-500/10 text-blue-400",
    SHIPPED: "bg-purple-500/10 text-purple-400",
    PARTIALLY_SHIPPED: "bg-purple-500/10 text-purple-400",
    DELIVERED: "bg-green-500/10 text-green-400",
    COMPLETED: "bg-green-500/10 text-green-400",
    CANCELLED: "bg-red-500/10 text-red-400",
    RETURNED: "bg-red-500/10 text-red-400",
    REFUNDED: "bg-red-500/10 text-red-400",
    UNPAID: "bg-yellow-500/10 text-yellow-400",
    PARTIALLY_PAID: "bg-blue-500/10 text-blue-400",
    PAID: "bg-green-500/10 text-green-400",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${
        style[normalizedStatus] || "bg-slate-500/10 text-slate-300"
      }`}
    >
      {normalizedStatus}
    </span>
  );
}

function TableLoadingOverlay() {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center rounded-xl bg-[#0F172A]/70 backdrop-blur-[1px]">
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#1E293B] px-5 py-4 text-white shadow-2xl">
        <Loader2 size={22} className="animate-spin text-blue-500" />
        <span className="text-sm font-semibold">Loading orders...</span>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [role, setRole] = useState("");
  const [tableLoading, setTableLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const [vendorStats, setVendorStats] = useState({
    totalOrders: 0,
    completedEarnings: 0,
    totalCommission: 0,
  });

  const [adminStats, setAdminStats] = useState({
    totalOrders: 0,
    grossProductSales: 0,
    totalCommission: 0,
    totalVendorEarnings: 0,
  });

  const [page, setPage] = useState(1);
  const limit = 10;

  // Draft filter values: changing these does not call the API.
  const [searchInput, setSearchInput] = useState("");
  const [statusInput, setStatusInput] = useState("ALL");
  const [paymentStatusInput, setPaymentStatusInput] = useState("ALL");
  const [sortInput, setSortInput] = useState("newest");

  // Applied values: only Search button updates these.
  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    status: "ALL",
    paymentStatus: "ALL",
    sort: "newest",
  });

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit,
    totalPages: 1,
  });

  const isSuperAdmin = role === "SUPER_ADMIN";
  const isAdmin = role === "ADMIN" || isSuperAdmin;
  const isVendor = role === "VENDOR";
  const isCustomer = role === "CUSTOMER";

  useEffect(() => {
    setRole(getLoggedInUserRole() || "");
  }, []);

  useEffect(() => {
    if (!role) return;

    let cancelled = false;

    const fetchOrders = async () => {
      try {
        setTableLoading(true);

        if (isVendor) {
          const response = await vendorService.getOrders({
            page,
            limit,
            search: appliedFilters.search,
            status:
              appliedFilters.status === "ALL"
                ? ""
                : appliedFilters.status,
            sort: appliedFilters.sort,
          });

          if (cancelled) return;

          const vendorOrders =
            response?.orders ||
            response?.data?.orders ||
            response?.data ||
            [];

          const safeOrders = Array.isArray(vendorOrders)
            ? vendorOrders
            : [];

          setOrders(safeOrders);

          setVendorStats({
            totalOrders: Number(
              response?.stats?.totalOrders ??
                response?.totalOrders ??
                safeOrders.length
            ),
            completedEarnings: Number(
              response?.stats?.completedEarnings || 0
            ),
            totalCommission: Number(
              response?.stats?.totalCommission || 0
            ),
          });

          setPagination({
            total:
              response?.totalOrders ||
              response?.pagination?.total ||
              safeOrders.length,
            page:
              response?.pagination?.page ||
              response?.page ||
              page,
            limit:
              response?.pagination?.limit ||
              response?.limit ||
              limit,
            totalPages:
              response?.totalPages ||
              response?.pagination?.totalPages ||
              1,
          });
        } else if (isAdmin) {
          const response = await api.get("/orders/admin/all", {
            params: {
              page,
              limit,
              search: appliedFilters.search,
              status:
                appliedFilters.status === "ALL"
                  ? ""
                  : appliedFilters.status,
              paymentStatus:
                appliedFilters.paymentStatus === "ALL"
                  ? ""
                  : appliedFilters.paymentStatus,
              sort: appliedFilters.sort,
            },
          });

          if (cancelled) return;

          const data = response?.data || {};
          const safeOrders = Array.isArray(data?.orders)
            ? data.orders
            : [];

          setOrders(safeOrders);

          setAdminStats({
            totalOrders: Number(
              data?.stats?.totalOrders ??
                data?.pagination?.total ??
                safeOrders.length
            ),
            grossProductSales: Number(
              data?.stats?.grossProductSales || 0
            ),
            totalCommission: Number(
              data?.stats?.totalCommission || 0
            ),
            totalVendorEarnings: Number(
              data?.stats?.totalVendorEarnings || 0
            ),
          });

          setPagination(
            data?.pagination || {
              total: safeOrders.length,
              page,
              limit,
              totalPages: 1,
            }
          );
        } else {
          const response = await api.get("/orders/my-orders");

          if (cancelled) return;

          const customerOrders =
            response?.data?.orders ||
            response?.data?.data ||
            [];

          const safeOrders = Array.isArray(customerOrders)
            ? customerOrders
            : [];

          setOrders(safeOrders);

          setPagination({
            total: safeOrders.length,
            page: 1,
            limit,
            totalPages: 1,
          });
        }
      } catch (error) {
        if (cancelled) return;

        console.error(
          "Orders fetch error:",
          error?.response?.data || error
        );

        setOrders([]);

        if (isVendor) {
          setVendorStats({
            totalOrders: 0,
            completedEarnings: 0,
            totalCommission: 0,
          });
        }

        if (isAdmin) {
          setAdminStats({
            totalOrders: 0,
            grossProductSales: 0,
            totalCommission: 0,
            totalVendorEarnings: 0,
          });
        }

        setPagination({
          total: 0,
          page,
          limit,
          totalPages: 1,
        });
      } finally {
        if (!cancelled) {
          setTableLoading(false);
          setSearching(false);
        }
      }
    };

    fetchOrders();

    return () => {
      cancelled = true;
    };
  }, [
    role,
    page,
    appliedFilters,
    isVendor,
    isAdmin,
  ]);

  const handleSearch = () => {
    if (tableLoading) return;

    setSearching(true);
    setPage(1);

    setAppliedFilters({
      search: searchInput.trim(),
      status: statusInput,
      paymentStatus: isVendor ? "ALL" : paymentStatusInput,
      sort: sortInput,
    });
  };

  const handleReset = () => {
    if (tableLoading) return;

    setSearchInput("");
    setStatusInput("ALL");
    setPaymentStatusInput("ALL");
    setSortInput("newest");
    setPage(1);
    setSearching(true);

    setAppliedFilters({
      search: "",
      status: "ALL",
      paymentStatus: "ALL",
      sort: "newest",
    });
  };

  if (isCustomer) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">My Orders</h1>

          <p className="text-sm text-slate-400">
            View your order history and current order status.
          </p>
        </div>

        <div className="relative min-h-[180px] rounded-xl border border-white/10 bg-[#1E293B] p-5">
          {tableLoading && <TableLoadingOverlay />}

          {orders.length === 0 ? (
            <p className="text-slate-400">No orders found.</p>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const orderId = order?.id || order?.orderId;

                const orderStatus =
                  order?.orderStatus ||
                  order?.status ||
                  "PENDING";

                return (
                  <div
                    key={orderId}
                    className="flex flex-col gap-4 rounded-lg bg-[#0F172A] p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-white">
                        #{order?.orderNumber || orderId}
                      </p>

                      <p className="text-sm text-slate-400">
                        {order?.createdAt
                          ? new Date(order.createdAt).toLocaleString(
                              "en-BD"
                            )
                          : "-"}
                      </p>
                    </div>

                    <div>
                      <p className="font-semibold text-white">
                        {money(order?.totalAmount)}
                      </p>

                      <StatusBadge status={orderStatus} />
                    </div>

                    <Link
                      href={`/dashboard/orders/${orderId}`}
                      className="rounded-lg bg-slate-700 px-4 py-2 text-center text-sm font-semibold text-white"
                    >
                      Details
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          {isVendor ? "Vendor Orders" : "Orders"}
        </h1>

        <p className="text-sm text-slate-400">
          {isVendor
            ? "Manage your own product orders. Status can be updated up to SHIPPED."
            : "Manage all marketplace orders."}
        </p>
      </div>

      <div
        className={`grid grid-cols-1 gap-4 ${
          isVendor
            ? "md:grid-cols-3"
            : isSuperAdmin
              ? "md:grid-cols-4"
              : "md:grid-cols-3"
        }`}
      >
        <div className="rounded-xl border border-white/10 bg-[#1E293B] p-5">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-blue-600/20 p-3 text-blue-400">
              <ShoppingCart size={24} />
            </div>

            <div>
              <p className="text-sm text-slate-400">
                {isVendor ? "My Orders" : "Total Orders"}
              </p>

              <h3 className="text-2xl font-bold text-white">
                {isVendor
                  ? vendorStats.totalOrders
                  : adminStats.totalOrders}
              </h3>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#1E293B] p-5">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-green-600/20 p-3 text-green-400">
              <Wallet size={24} />
            </div>

            <div>
              <p className="text-sm text-slate-400">
                {isVendor
                  ? "Completed Earnings"
                  : "Gross Product Sales"}
              </p>

              <h3 className="text-2xl font-bold text-white">
                {money(
                  isVendor
                    ? vendorStats.completedEarnings
                    : adminStats.grossProductSales
                )}
              </h3>
            </div>
          </div>
        </div>

        {isVendor && (
          <div className="rounded-xl border border-white/10 bg-[#1E293B] p-5">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-orange-600/20 p-3 text-orange-400">
                <BadgeDollarSign size={24} />
              </div>

              <div>
                <p className="text-sm text-slate-400">
                  Total Commission
                </p>

                <h3 className="text-2xl font-bold text-white">
                  {money(vendorStats.totalCommission)}
                </h3>
              </div>
            </div>
          </div>
        )}

        {isSuperAdmin && (
          <div className="rounded-xl border border-white/10 bg-[#1E293B] p-5">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-purple-600/20 p-3 text-purple-400">
                <Wallet size={24} />
              </div>

              <div>
                <p className="text-sm text-slate-400">
                  Vendor Earnings
                </p>

                <h3 className="text-2xl font-bold text-white">
                  {money(adminStats.totalVendorEarnings)}
                </h3>
              </div>
            </div>
          </div>
        )}

        {isSuperAdmin && (
          <div className="rounded-xl border border-white/10 bg-[#1E293B] p-5">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-orange-600/20 p-3 text-orange-400">
                <BadgeDollarSign size={24} />
              </div>

              <div>
                <p className="text-sm text-slate-400">
                  Platform Earnings
                </p>

                <h3 className="text-2xl font-bold text-white">
                  {money(adminStats.totalCommission)}
                </h3>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-[#1E293B] p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <input
            value={searchInput}
            disabled={tableLoading}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSearch();
              }
            }}
            placeholder="Search order/customer/phone..."
            className="rounded-lg border border-white/10 bg-[#0F172A] px-4 py-2 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />

          <select
            value={statusInput}
            disabled={tableLoading}
            onChange={(event) => setStatusInput(event.target.value)}
            className="rounded-lg border border-white/10 bg-[#0F172A] px-4 py-2 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PROCESSING">Processing</option>
            <option value="SHIPPED">Shipped</option>

            {!isVendor && (
              <>
                <option value="DELIVERED">Delivered</option>
                <option value="COMPLETED">Completed</option>
              </>
            )}

            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={paymentStatusInput}
            disabled={isVendor || tableLoading}
            onChange={(event) =>
              setPaymentStatusInput(event.target.value)
            }
            className="rounded-lg border border-white/10 bg-[#0F172A] px-4 py-2 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="ALL">All Payment</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Paid</option>
          </select>

          <select
            value={sortInput}
            disabled={tableLoading}
            onChange={(event) => setSortInput(event.target.value)}
            className="rounded-lg border border-white/10 bg-[#0F172A] px-4 py-2 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>

          <button
            type="button"
            onClick={handleSearch}
            disabled={tableLoading || searching}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {searching ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search size={16} />
                Search
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={tableLoading}
            className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Only this table and pagination section shows loading. */}
      <div className="relative space-y-5">
        {tableLoading && <TableLoadingOverlay />}

        <div className="min-h-[180px] overflow-hidden rounded-xl border border-white/10 bg-[#1E293B]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] text-left text-sm">
              <thead className="border-b border-white/10 text-slate-400">
                <tr>
                  <th className="px-4 py-4">Order</th>
                  <th className="px-4 py-4">Customer</th>

                  {isAdmin && (
                    <th className="px-4 py-4">Vendor</th>
                  )}

                  <th className="px-4 py-4">
                    {isVendor ? "Your Earning" : "Product Total"}
                  </th>

                  {isAdmin && (
                    <th className="px-4 py-4">Vendor Earning</th>
                  )}

                  <th className="px-4 py-4">Payment</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Commission</th>
                  <th className="px-4 py-4">Date</th>
                  <th className="px-4 py-4 text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isVendor ? 8 : 10}
                      className="px-4 py-10 text-center text-slate-400"
                    >
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const orderId = order?.id || order?.orderId;

                    const customer =
                      order?.user || order?.customer || {};

                    const productImage = getOrderImage(order);

                    const vendors = [
                      ...new Set(
                        (order?.items || [])
                          .map(
                            (item) =>
                              item?.vendor?.shopName ||
                              item?.product?.vendor?.shopName
                          )
                          .filter(Boolean)
                      ),
                    ];

                    const orderStatus =
                      order?.orderStatus ||
                      order?.status ||
                      order?.vendorStatus ||
                      "PENDING";

                    return (
                      <tr
                        key={orderId}
                        className="border-b border-white/10 text-white last:border-b-0 hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            {productImage ? (
                              <Image
                                src={productImage}
                                alt="Order"
                                width={44}
                                height={44}
                                className="h-11 w-11 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-700 text-xs text-slate-400">
                                N/A
                              </div>
                            )}

                            <div>
                              <p className="font-semibold">
                                #{order?.orderNumber || orderId}
                              </p>

                              <p className="text-xs text-slate-400">
                                {order?.items?.length ||
                                  order?.itemCount ||
                                  0}{" "}
                                item(s)
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-semibold">
                            {customer?.name ||
                              order?.customerName ||
                              "N/A"}
                          </p>

                          <p className="text-xs text-slate-400">
                            {customer?.phone ||
                              order?.phone ||
                              order?.shippingAddress?.phone ||
                              ""}
                          </p>
                        </td>

                        {isAdmin && (
                          <td className="px-4 py-4">
                            {vendors.length ? vendors.join(", ") : "-"}
                          </td>
                        )}

                        <td className="px-4 py-4 font-semibold text-blue-400">
                          {money(
                            isVendor
                              ? order?.vendorEarning ??
                                  order?.vendorTotal ??
                                  0
                              : order?.productTotal ??
                                  order?.totalAmount ??
                                  0
                          )}
                        </td>

                        {isAdmin && (
                          <td className="px-4 py-4 font-semibold text-purple-400">
                            {money(
                              order?.totalVendorEarning ??
                                order?.vendorEarning ??
                                0
                            )}
                          </td>
                        )}

                        <td className="px-4 py-4">
                          <p>{order?.paymentMethod || "COD"}</p>

                          <StatusBadge
                            status={order?.paymentStatus || "UNPAID"}
                          />
                        </td>

                        <td className="px-4 py-4">
                          <StatusBadge status={orderStatus} />
                        </td>

                        <td className="px-4 py-4 font-semibold text-orange-400">
                          {money(order?.totalCommission || 0)}
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {order?.createdAt
                            ? new Date(order.createdAt).toLocaleString(
                                "en-BD"
                              )
                            : "-"}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end">
                            <Link
                              href={`/dashboard/orders/${orderId}`}
                              className="rounded-lg bg-slate-600 p-2 text-white hover:bg-slate-500"
                              title="View"
                            >
                              <Eye size={16} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div
          className={`flex flex-col items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#1E293B] p-4 transition md:flex-row ${
            tableLoading ? "pointer-events-none opacity-60" : ""
          }`}
        >
          <p className="text-sm text-slate-400">
            Showing page {page} of {pagination.totalPages} — Total{" "}
            {pagination.total} orders
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={tableLoading || page <= 1}
              onClick={() =>
                setPage((previous) => Math.max(previous - 1, 1))
              }
              className="rounded-lg bg-slate-600 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prev
            </button>

            <span className="rounded-lg bg-[#0F172A] px-4 py-2 text-sm text-white">
              {page}
            </span>

            <button
              type="button"
              disabled={
                tableLoading || page >= pagination.totalPages
              }
              onClick={() =>
                setPage((previous) =>
                  Math.min(previous + 1, pagination.totalPages)
                )
              }
              className="rounded-lg bg-slate-600 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
