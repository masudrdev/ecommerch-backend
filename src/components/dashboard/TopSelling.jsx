import Link from "next/link";
import { TrendingUp } from "lucide-react";

function money(value) {
  return `৳${Number(value || 0).toLocaleString("en-BD")}`;
}

export default function TopSelling({ products = [] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#1E293B] p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <TrendingUp className="text-green-400" size={20} />
        <h2 className="text-lg font-bold text-white">Top Selling Products</h2>
      </div>

      <div className="mt-4 space-y-3">
        {products.map((item, index) => (
          <div key={item.product?.id || index} className="rounded-lg bg-[#0F172A] p-4">
            <div className="flex items-start gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">
                #{index + 1}
              </span>

              <div className="min-w-0">
                <p className="break-words font-semibold text-white">
                  {item.product?.name || "Product"}
                </p>

                <div className="mt-2 flex flex-col gap-1 text-sm sm:flex-row sm:gap-4">
                  <span className="text-green-400">
                    Sold: <strong>{item.sold || 0}</strong>
                  </span>
                  <span className="text-blue-400">
                    Revenue: <strong>{money(item.revenue || 0)}</strong>
                  </span>
                </div>
              </div>
            </div>

            <Link
              href={`/dashboard/products/${item.product?.id}`}
              className="mt-3 inline-flex w-full justify-center rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-600 sm:w-auto"
            >
              View Product
            </Link>
          </div>
        ))}

        {products.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400">
            No top selling products found.
          </p>
        )}
      </div>
    </div>
  );
}