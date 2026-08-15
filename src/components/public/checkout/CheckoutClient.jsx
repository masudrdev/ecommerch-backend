"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { clearCart } from "@/redux/features/cart/cartSlice";
import { checkoutOrderApi } from "@/services/order.service";
import { getMyAddressesApi } from "@/services/address.service";

export default function CheckoutClient() {
  const [placingOrder, setPlacingOrder] = useState(false);
  const items = useSelector((state) => state.cart.items);
  const router = useRouter();
  const dispatch = useDispatch();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    district: "",
    area: "",
    address: "",
    paymentMethod: "COD",
  });

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const res = await getMyAddressesApi();
      const list = res?.addresses || [];
      setAddresses(list);

      const defaultAddress = list.find((item) => item.isDefault) || list[0];

      if (defaultAddress) {
        applyAddress(defaultAddress);
      }
    } catch (error) {
      console.error("Checkout address fetch error:", error);
    }
  };

  const applyAddress = (item) => {
    setSelectedAddressId(item.id);

    setFormData((prev) => ({
      ...prev,
      name: item.fullName || "",
      phone: item.phone || "",
      district: item.district || "",
      area: item.upazila || "",
      address: item.address || "",
    }));
  };

  const subtotal = items.reduce(
    (total, item) => total + Number(item.price || 0) * item.quantity,
    0
  );

  const deliveryCharge = 0;
  const total = subtotal + deliveryCharge;

  const handleChange = (e) => {
    setSelectedAddressId("");
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

const handlePlaceOrder = async (e) => {
  e.preventDefault();

  if (placingOrder) return;

  try {
    setPlacingOrder(true);

    const payload = {
      customerName: formData.name,
      phone: formData.phone,
      email: formData.email,
      district: formData.district,
      upazila: formData.area,
      address: formData.address,
      paymentMethod: "COD",
      deliveryFee: deliveryCharge,
    };

    const res = await checkoutOrderApi(payload);

    toast.success("Order placed successfully");

    dispatch(clearCart());

    const orderId = res?.order?.id || res?.data?.id || res?.id;

    router.push(
      orderId
        ? `/order-success?orderId=${orderId}`
        : "/order-success"
    );
  } catch (error) {
    console.log(error);

    toast.error(
      error?.response?.data?.message || "Failed to place order"
    );
  } finally {
    setPlacingOrder(false);
  }
};

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-7xl px-3 py-10">
        <div className="rounded-xl border bg-white p-8 text-center">
          <h1 className="text-2xl font-bold">Your cart is empty</h1>
          <p className="mt-2 text-sm text-gray-500">
            Please add products before checkout.
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
      <h1 className="mb-5 text-2xl font-bold">Checkout</h1>

      <form onSubmit={handlePlaceOrder} className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-xl border bg-white p-5">
          <h2 className="mb-4 text-xl font-bold">Customer Information</h2>

          {addresses.length > 0 && (
            <div className="mb-5 rounded-xl border bg-orange-50 p-4">
              <h3 className="mb-3 font-bold">Saved Addresses</h3>

              <div className="grid gap-3 md:grid-cols-2">
                {addresses.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => applyAddress(item)}
                    className={`rounded-lg border p-3 text-left text-sm ${
                      selectedAddressId === item.id
                        ? "border-orange-600 bg-white"
                        : "border-orange-100 bg-white/70"
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span className="rounded bg-orange-600 px-2 py-0.5 text-xs font-semibold text-white">
                        {item.type}
                      </span>

                      {item.isDefault && (
                        <span className="rounded bg-green-600 px-2 py-0.5 text-xs font-semibold text-white">
                          Default
                        </span>
                      )}
                    </div>

                    <p className="font-semibold">{item.fullName}</p>
                    <p className="text-gray-600">{item.phone}</p>
                    <p className="mt-1 text-gray-500">
                      {item.address}, {item.upazila}, {item.district}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Full Name"
              className="rounded-md border px-3 py-3 outline-none focus:border-orange-600"
            />

            <input
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              placeholder="Phone Number"
              className="rounded-md border px-3 py-3 outline-none focus:border-orange-600"
            />

            <input
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email Optional"
              className="rounded-md border px-3 py-3 outline-none focus:border-orange-600"
            />

            <input
              name="district"
              value={formData.district}
              onChange={handleChange}
              required
              placeholder="District / City"
              className="rounded-md border px-3 py-3 outline-none focus:border-orange-600"
            />

            <input
              name="area"
              value={formData.area}
              onChange={handleChange}
              required
              placeholder="Area / Thana"
              className="rounded-md border px-3 py-3 outline-none focus:border-orange-600"
            />

            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              required
              placeholder="Full Address"
              rows={4}
              className="rounded-md border px-3 py-3 outline-none focus:border-orange-600 md:col-span-2"
            />
          </div>

          <div className="mt-6 rounded-xl border p-4">
            <h3 className="mb-3 font-bold">Payment Method</h3>

            <label className="flex cursor-pointer items-center gap-3 rounded-md border border-orange-600 bg-orange-50 p-3">
              <input
                type="radio"
                name="paymentMethod"
                value="COD"
                checked={formData.paymentMethod === "COD"}
                onChange={handleChange}
              />
              <span className="font-medium">Cash On Delivery</span>
            </label>
          </div>
        </div>

        <div className="h-fit rounded-xl border bg-white p-5">
          <h2 className="mb-4 text-xl font-bold">Order Summary</h2>

          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.cartId} className="flex gap-3 border-b pb-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-gray-50">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-contain p-1"
                  />
                </div>

                <div className="flex-1">
                  <p className="line-clamp-1 text-sm font-semibold">{item.name}</p>
                  <p className="text-xs text-gray-500">
                    Qty: {item.quantity}
                    {item.color && ` | Color: ${item.color}`}
                    {item.size && ` | Size: ${item.size}`}
                  </p>
                  <p className="mt-1 text-sm font-bold text-orange-600">
                    ৳{Number(item.price || 0) * item.quantity}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>৳{subtotal}</span>
            </div>

            <div className="flex justify-between">
              <span>Delivery Charge</span>
              <span>৳{deliveryCharge}</span>
            </div>

            <div className="flex justify-between border-t pt-3 text-lg font-bold">
              <span>Total</span>
              <span className="text-orange-600">৳{total}</span>
            </div>
          </div>

<button
  type="submit"
  disabled={placingOrder}
  className="mt-5 w-full rounded-md bg-orange-600 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
>
  {placingOrder ? "Placing Order..." : "Place Order"}
</button>
        </div>
      </form>
    </section>
  );
}