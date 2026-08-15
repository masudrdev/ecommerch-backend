import Link from "next/link";

export default function OrderSuccessPage() {
  return (
    <section className="mx-auto max-w-7xl px-3 py-10">
      <div className="mx-auto max-w-xl rounded-xl border bg-white p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
          ✅
        </div>

        <h1 className="text-2xl font-bold">Order Placed Successfully</h1>

        <p className="mt-2 text-sm text-gray-500">
          Thank you for shopping with FriendBazar.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/my-orders"
            className="rounded-md bg-orange-600 px-5 py-3 font-semibold text-white"
          >
            My Orders
          </Link>

          <Link
            href="/products"
            className="rounded-md border px-5 py-3 font-semibold"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </section>
  );
}