import {
  Package,
  ShoppingCart,
  Clock,
  CheckCircle,
  Wallet,
  Star,
  AlertTriangle,
  Truck,
  XCircle,
  TrendingUp,
} from "lucide-react";

function money(value) {
  return `৳${Number(value || 0).toLocaleString("en-BD")}`;
}

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

export default function StatCards({ stats }) {
  const product = stats.productStats || {};
  const order = stats.orderStats || {};
  const sales = stats.salesStats || {};
  const review = stats.reviewStats || {};

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Products" value={product.total || 0} icon={Package} />
        <StatCard title="Approved Products" value={product.approved || 0} icon={CheckCircle} />
        <StatCard title="Pending Products" value={product.pending || 0} icon={Clock} />
        <StatCard title="Out of Stock" value={product.outOfStock || 0} icon={AlertTriangle} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Orders" value={order.total || 0} icon={ShoppingCart} />
        <StatCard title="Processing" value={order.processing || 0} icon={Clock} />
        <StatCard title="Shipped" value={order.shipped || 0} icon={Truck} />
        <StatCard title="Delivered" value={order.delivered || 0} icon={CheckCircle} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Revenue" value={money(sales.totalRevenue)} icon={Wallet} />
        <StatCard title="This Month" value={money(sales.thisMonthRevenue)} icon={TrendingUp} />
        <StatCard title="Today" value={money(sales.todayRevenue)} icon={TrendingUp} />
        <StatCard title="Available Balance" value={money(sales.availableBalance)} icon={Wallet} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Reviews" value={review.total || 0} icon={Star} />
        <StatCard title="Average Rating" value={`${review.average || 0} ⭐`} icon={Star} />
        <StatCard title="Pending Reply" value={review.pendingReply || 0} icon={Clock} />
        <StatCard title="Cancelled Orders" value={order.cancelled || 0} icon={XCircle} />
      </div>
    </>
  );
}