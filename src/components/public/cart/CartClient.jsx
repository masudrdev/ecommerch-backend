"use client";

import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { getCartApi, removeCartItemApi, updateCartItemApi } from "@/services/cartService";
import { setCart } from "@/redux/features/cart/cartSlice";

export default function CartClient() {
  const dispatch = useDispatch();
  const items = useSelector((state) => state.cart.items);

  const reloadCart = async () => {
    const res = await getCartApi();
    dispatch(setCart(res?.cart?.items || []));
  };

 const handleIncrease = async (item) => {
  try {
    await updateCartItemApi(item.cartItemId, {
      quantity: item.quantity + 1,
      color: item.color,
      size: item.size,
    });

    await reloadCart();
  } catch (error) {
    toast.error("Failed to update quantity");
  }
};

const handleDecrease = async (item) => {
  if (item.quantity <= 1) return;

  try {
    await updateCartItemApi(item.cartItemId, {
      quantity: item.quantity - 1,
      color: item.color,
      size: item.size,
    });

    await reloadCart();
  } catch (error) {
    toast.error("Failed to update quantity");
  }
};

  const handleRemove = async (itemId) => {
    try {
      await removeCartItemApi(itemId);
      await reloadCart();
      toast.success("Item removed");
    } catch (error) {
      toast.error("Failed to remove item");
    }
  };

  const subtotal = items.reduce(
    (total, item) => total + Number(item.price || 0) * item.quantity,
    0
  );

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-7xl px-3 py-10">
        <div className="rounded-xl border bg-white p-8 text-center">
          <h1 className="text-2xl font-bold">Your cart is empty</h1>
          <p className="mt-2 text-sm text-gray-500">
            Add products to your cart and continue shopping.
          </p>

          <Link
            href="/products"
            className="mt-5 inline-block rounded-md bg-orange-600 px-5 py-3 font-semibold text-white"
          >
            Continue Shopping
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-3 py-6">
      <h1 className="mb-5 text-2xl font-bold">Shopping Cart</h1>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.cartId}
              className="flex gap-3 rounded-xl border bg-white p-3"
            >
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border bg-gray-50">
                <Image
                  src={item.image}
                  alt={item.name || "Product image"}
                  fill
                  className="object-contain p-2"
                />
              </div>

              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <Link
                    href={`/products/${item.slug}`}
                    className="line-clamp-2 font-semibold"
                  >
                    {item.name}
                  </Link>

                  <p className="mt-1 text-sm text-gray-500">
                    {item.color && `Color: ${item.color}`}{" "}
                    {item.size && `| Size: ${item.size}`}
                  </p>

                  <p className="mt-2 font-bold text-orange-600">
                    ৳{item.price}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex w-fit items-center overflow-hidden rounded-md border">
                    <button
                      type="button"
                      onClick={() => handleDecrease(item)}
                      className="px-3 py-1"
                    >
                      -
                    </button>

                    <span className="border-x px-4 py-1">
                      {item.quantity}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleIncrease(item)}
                      className="px-3 py-1"
                    >
                      +
                    </button>
                  </div>
<button
  type="button"
  onClick={() => handleRemove(item.cartItemId)}
  className="rounded-md border p-2 text-red-500"
>
  <Trash2 size={17} />
</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="h-fit rounded-xl border bg-white p-5">
          <h2 className="mb-4 text-xl font-bold">Order Summary</h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>৳{subtotal}</span>
            </div>

            <div className="flex justify-between">
              <span>Delivery Charge</span>
              <span>৳0</span>
            </div>

            <div className="flex justify-between border-t pt-3 text-lg font-bold">
              <span>Total</span>
              <span className="text-orange-600">৳{subtotal}</span>
            </div>
          </div>

          <Link
            href="/checkout"
            className="mt-5 block rounded-md bg-orange-600 px-5 py-3 text-center font-semibold text-white"
          >
            Proceed to Checkout
          </Link>
        </div>
      </div>
    </section>
  );
}