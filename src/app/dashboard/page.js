"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  ShoppingCart,
  Clock,
  CheckCircle,
  Package,
  Wallet,
  UserCheck,
  Inbox,
} from "lucide-react";
import Link from "next/link";

import { ROLES } from "@/constants/roles";
import { dashboardService } from "@/services/dashboard.service";
import { vendorService } from "@/services/vendor.service";
import { getMyOrdersApi } from "@/services/order.service";
import { getSupportDashboardStatsApi } from "@/services/ticket.service";

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import StatCards from "@/components/dashboard/StatCards";
import SalesChart from "@/components/dashboard/SalesChart";
import LatestOrders from "@/components/dashboard/LatestOrders";
import LatestReviews from "@/components/dashboard/LatestReviews";
import LowStock from "@/components/dashboard/LowStock";
import TopSelling from "@/components/dashboard/TopSelling";

const money = (amount) =>
  `৳${Number(amount || 0).toLocaleString("en-BD")}`;

function StatCard({ title, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#1E293B] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-400">{title}</p>

          <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            {value}
          </h2>
        </div>

        <div className="rounded-xl bg-blue-600/20 p-3 text-blue-400">
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}

function CustomerOverview({ stats }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Customer Dashboard
        </h1>

        <p className="mt-1 text-sm text-gray-400">
          Welcome back.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Orders"
          value={stats.totalOrders || 0}
          icon={ShoppingCart}
        />

        <StatCard
          title="Pending Orders"
          value={stats.pendingOrders || 0}
          icon={Clock}
        />

        <StatCard
          title="Delivered Orders"
          value={stats.deliveredOrders || 0}
          icon={CheckCircle}
        />

        <StatCard
          title="Wishlist Items"
          value={stats.wishlistItems || 0}
          icon={Package}
        />
      </div>
    </div>
  );
}

function SupportAgentOverview({ stats }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Support Agent Dashboard
        </h1>

        <p className="mt-1 text-sm text-gray-400">
          Manage customer and vendor support tickets.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Assigned Tickets"
          value={stats.assignedToMe || 0}
          icon={UserCheck}
        />

        <StatCard
          title="Unassigned Tickets"
          value={stats.unassigned || 0}
          icon={Inbox}
        />

        <StatCard
          title="Waiting for Staff"
          value={stats.waitingForStaff || 0}
          icon={Clock}
        />

        <StatCard
          title="Resolved Tickets"
          value={stats.resolved || 0}
          icon={CheckCircle}
        />
      </div>

      <Link
        href="/dashboard/support"
        className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        View All Support Tickets
      </Link>
    </div>
  );
}

function VendorOverview({
  stats,
  chartPeriod,
  handleChartPeriodChange,
  chartLoading,
}) {
  return (
    <div className="space-y-6">
      <DashboardHeader />

      <StatCards stats={stats} />

      <SalesChart
        data={stats.salesChart || []}
        chartPeriod={chartPeriod}
        handleChartPeriodChange={handleChartPeriodChange}
        chartLoading={chartLoading}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <LatestOrders orders={stats.latestOrders || []} />

        <LatestReviews
          reviews={stats.latestReviews || []}
        />

        <LowStock
          products={stats.lowStockProducts || []}
        />

        <TopSelling
          products={stats.topSellingProducts || []}
        />
      </div>
    </div>
  );
}

function AdminOverview({ stats }) {
  const cards = [
    {
      title: "Total Orders",
      value: stats.totalOrders || 0,
      icon: ShoppingCart,
    },
    {
      title: "Pending Orders",
      value: stats.pendingOrders || 0,
      icon: Clock,
    },
    {
      title: "Completed Orders",
      value: stats.completedOrders || 0,
      icon: CheckCircle,
    },
    {
      title: "Cancelled Orders",
      value: stats.cancelledOrders || 0,
      icon: Package,
    },
    {
      title: "Total Products",
      value: stats.totalProducts || 0,
      icon: Package,
    },
    {
      title: "Pending Products",
      value: stats.pendingProducts || 0,
      icon: Clock,
    },
    {
      title: "Approved Products",
      value: stats.approvedProducts || 0,
      icon: CheckCircle,
    },
    {
      title: "Rejected Products",
      value: stats.rejectedProducts || 0,
      icon: Package,
    },
    {
      title: "Total Vendors",
      value: stats.totalVendors || 0,
      icon: Wallet,
    },
    {
      title: "Pending Vendors",
      value: stats.pendingVendors || 0,
      icon: Clock,
    },
    {
      title: "Approved Vendors",
      value: stats.approvedVendors || 0,
      icon: CheckCircle,
    },
    {
      title: "Total Customers",
      value: stats.totalCustomers || 0,
      icon: ShoppingCart,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">
          Admin Dashboard
        </h1>

        <p className="mt-1 text-gray-500">
          Orders, products, vendors and customer overview.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <StatCard
            key={card.title}
            title={card.title}
            value={card.value}
            icon={card.icon}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardTable
          title="Latest Orders"
          items={stats.latestOrders || []}
          renderItem={(order) => (
            <Link
              href={`/dashboard/orders/${order.id}`}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0F172A] p-3 transition hover:border-blue-500"
            >
              <div>
                <p className="font-semibold text-white">
                  {order.orderNumber}
                </p>

                <p className="text-sm text-gray-400">
                  {order.customerName || "Customer Name"}
                </p>
              </div>

              <div className="text-right">
                <p className="font-semibold text-white">
                  {money(order.totalAmount)}
                </p>

                <p className="text-xs uppercase text-gray-400">
                  {order.orderStatus}
                </p>
              </div>
            </Link>
          )}
        />

        <DashboardTable
          title="Pending Vendor Approval"
          items={stats.pendingVendorApproval || []}
          renderItem={(vendor) => (
            <Link
              href="/dashboard/vendors"
              className="block rounded-lg border border-white/10 bg-[#0F172A] p-3 transition hover:border-blue-500"
            >
              <p className="font-semibold text-white">
                {vendor.shopName}
              </p>

              <p className="text-sm text-gray-400">
                {vendor.user?.name || "Vendor"} ·{" "}
                {vendor.user?.phone ||
                  vendor.user?.email ||
                  "No contact"}
              </p>
            </Link>
          )}
        />

        <DashboardTable
          title="Pending Product Approval"
          items={stats.pendingProductApproval || []}
          renderItem={(product) => (
            <Link
              href="/dashboard/products"
              className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0F172A] p-3 transition hover:border-blue-500"
            >
              <div>
                <p className="font-semibold text-white">
                  {product.name}
                </p>

                <p className="text-sm text-gray-400">
                  {product.vendor?.shopName || "No vendor"}
                </p>
              </div>

              <p className="font-semibold text-white">
                {money(product.price)}
              </p>
            </Link>
          )}
        />

        <DashboardTable
          title="Low Stock Products"
          items={stats.lowStockProducts || []}
          renderItem={(product) => (
            <Link
              href="/dashboard/products"
              className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0F172A] p-3 transition hover:border-red-500"
            >
              <div>
                <p className="font-semibold text-white">
                  {product.name}
                </p>

                <p className="text-sm text-gray-400">
                  {product.vendor?.shopName || "No vendor"}
                </p>
              </div>

              <p className="font-semibold text-red-400">
                Stock: {product.stock || 0}
              </p>
            </Link>
          )}
        />
      </div>
    </div>
  );
}

function DashboardTable({ title, items, renderItem }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#1E293B] p-4 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-white">
        {title}
      </h2>

      <div className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.id}>{renderItem(item)}</div>
          ))
        ) : (
          <p className="text-sm text-gray-500">
            No data found.
          </p>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useSelector((state) => state.auth);

  const [stats, setStats] = useState({});
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [chartPeriod, setChartPeriod] =
    useState("7d");
  const [chartLoading, setChartLoading] =
    useState(false);

  const role = user?.role || ROLES.CUSTOMER;

  const handleChartPeriodChange = async (period) => {
    try {
      setChartPeriod(period);
      setChartLoading(true);

      const res =
        await vendorService.getSalesChart(period);

      setStats((previousStats) => ({
        ...previousStats,
        salesChart: res?.salesChart || [],
      }));
    } catch (error) {
      console.error(
        "Vendor sales chart error:",
        error?.response?.data || error
      );
    } finally {
      setChartLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.role) {
        return;
      }

      try {
        setLoading(true);

        if (role === ROLES.VENDOR) {
          const res =
            await vendorService.getDashboard(
              chartPeriod
            );

          setStats(res?.dashboard || {});
          setOrders([]);
        } else if (role === ROLES.CUSTOMER) {
          const res =
            await dashboardService.getCustomerDashboard();

          const orderRes = await getMyOrdersApi();

          setStats(res?.dashboard || {});
          setOrders(orderRes?.orders || []);
        } else if (
          role === ROLES.SUPPORT_AGENT
        ) {
          const res =
            await getSupportDashboardStatsApi();

          setStats(res?.stats || {});
          setOrders([]);
        } else if (
          role === ROLES.ADMIN ||
          role === ROLES.SUPER_ADMIN
        ) {
          const res =
            await dashboardService.getAdminDashboard();

          setStats(res?.dashboard || {});
          setOrders([]);
        } else {
          setStats({});
          setOrders([]);
        }
      } catch (error) {
        console.error(
          "Dashboard data error:",
          error?.response?.data || error
        );

        setStats({});
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [role, user?.role, chartPeriod]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(
          (item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-xl bg-[#1E293B]"
            />
          )
        )}
      </div>
    );
  }

  if (role === ROLES.VENDOR) {
    return (
      <VendorOverview
        stats={stats}
        chartPeriod={chartPeriod}
        handleChartPeriodChange={
          handleChartPeriodChange
        }
        chartLoading={chartLoading}
      />
    );
  }

  if (role === ROLES.SUPPORT_AGENT) {
    return <SupportAgentOverview stats={stats} />;
  }

  if (
    role === ROLES.ADMIN ||
    role === ROLES.SUPER_ADMIN
  ) {
    return <AdminOverview stats={stats} />;
  }

  return <CustomerOverview stats={stats} />;
}