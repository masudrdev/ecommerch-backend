import Link from "next/link";

function money(value) {
  return `৳${Number(value || 0).toLocaleString("en-BD")}`;
}

export default function LatestOrders({ orders = [] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#1E293B] p-4 sm:p-5">
      <h2 className="text-lg font-bold text-white">Latest Orders</h2>

      <div className="mt-4 space-y-3">
        {orders.map((item) => (
          <div key={item.id} className="rounded-lg bg-[#0F172A] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold text-white">
                  {item.order?.orderNumber || item.order?.id}
                </p>
                <p className="mt-1 text-sm text-gray-400">
                  Customer: {item.order?.customerName || "-"}
                </p>
                <p className="mt-1 truncate text-sm text-gray-300">
                  Product: {item.product?.name || "-"}
                </p>
              </div>

              <div className="sm:text-right">
                <p className="font-semibold text-white">
                  {money(item.price * item.quantity)}
                </p>
                <p className="mt-1 text-sm text-orange-400">{item.itemStatus}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleDateString("en-BD")
                    : ""}
                </p>
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

        {orders.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400">
            No latest orders found.
          </p>
        )}
      </div>
    </div>
  );
}