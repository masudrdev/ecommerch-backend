import Link from "next/link";

export default function LowStock({ products = [] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#1E293B] p-4 sm:p-5">
      <h2 className="text-lg font-bold text-white">Low Stock Products</h2>

      <div className="mt-4 space-y-3">
        {products.map((item) => (
          <div key={item.id} className="rounded-lg bg-[#0F172A] p-4">
            <p className="break-words font-semibold text-white">{item.name}</p>
            <p className="mt-1 text-sm text-orange-400">Stock: {item.stock}</p>

            <Link
              href={`/dashboard/products/${item.id}`}
              className="mt-3 inline-flex w-full justify-center rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-600 sm:w-auto"
            >
              View
            </Link>
          </div>
        ))}

        {products.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400">
            No low stock products found.
          </p>
        )}
      </div>
    </div>
  );
}