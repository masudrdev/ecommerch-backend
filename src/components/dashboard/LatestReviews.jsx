import Link from "next/link";

function Stars({ rating }) {
  return (
    <span className="text-sm text-yellow-400">
      {"★".repeat(rating || 0)}
      <span className="text-gray-500">{"★".repeat(5 - (rating || 0))}</span>
    </span>
  );
}

export default function LatestReviews({ reviews = [] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#1E293B] p-4 sm:p-5">
      <h2 className="text-lg font-bold text-white">Latest Reviews</h2>

      <div className="mt-4 space-y-3">
        {reviews.map((item) => (
          <div key={item.id} className="rounded-lg bg-[#0F172A] p-4">
            <p className="break-words font-semibold text-white">
              {item.product?.name || "Product"}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Customer: {item.user?.name || item.user?.username || "Customer"}
            </p>

            <div className="mt-2">
              <Stars rating={item.rating} />
            </div>

            <p className="mt-2 break-words text-sm text-gray-300">
              {item.comment || "No comment"}
            </p>

            <Link
              href="/dashboard/reviews"
              className="mt-3 inline-flex w-full justify-center rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-600 sm:w-auto"
            >
              Reply
            </Link>
          </div>
        ))}

        {reviews.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400">
            No latest reviews found.
          </p>
        )}
      </div>
    </div>
  );
}