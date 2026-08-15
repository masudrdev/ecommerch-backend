import Link from "next/link";
import { Plus } from "lucide-react";

export default function DashboardHeader() {
  return (
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-2xl font-bold text-white">Vendor Dashboard</h1>
        <p className="mt-1 text-sm text-gray-400">
          Products, orders, sales, reviews and stock overview.
        </p>
      </div>

      <Link
        href="/dashboard/products/add"
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        <Plus size={18} />
        Add Product
      </Link>
    </div>
  );
}