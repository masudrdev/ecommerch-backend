"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useSelector } from "react-redux";

export default function CartIcon() {
  const items = useSelector((state) => state.cart.items);

  const totalItems = items.reduce(
    (total, item) => total + item.quantity,
    0
  );

  return (
    <Link href="/cart" className="relative rounded-md border p-2">
      <ShoppingCart size={20} />

      <span className="absolute -right-2 -top-2 rounded-full bg-orange-600 px-1.5 text-xs text-white">
        {totalItems}
      </span>
    </Link>
  );
}