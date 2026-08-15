"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  getMyWishlistApi,
  removeFromWishlistApi,
} from "@/services/wishlist.service";

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const res = await getMyWishlistApi();
      setWishlist(res?.wishlist || []);
    } catch (error) {
      console.error("Wishlist error:", error);
      setWishlist([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (productId) => {
    const confirmRemove = window.confirm(
      "Are you sure you want to remove this product from wishlist?"
    );

    if (!confirmRemove) return;

    try {
      await removeFromWishlistApi(productId);
      fetchWishlist();
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to remove product");
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold text-white">Wishlist</h1>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-72 animate-pulse rounded-xl bg-[#1E293B]"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Wishlist</h1>
        <p className="mt-1 text-sm text-gray-400">
          Your saved products for later.
        </p>
      </div>

      {wishlist.length === 0 ? (
        <div className="rounded-xl bg-[#1E293B] p-6 text-center text-sm text-gray-300">
          Your wishlist is empty.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {wishlist.map((item) => {
            const product = item.product;
            const image =
              product?.mainImage ||
              product?.images?.[0]?.url ||
              product?.images?.[0]?.imageUrl ||
              "/placeholder.png";

            const price = product?.salePrice || product?.price || 0;

            return (
              <div
                key={item.id}
                className="overflow-hidden rounded-xl bg-[#1E293B] shadow-sm"
              >
                <div className="relative h-48 bg-slate-800">
                  <Image
                    src={image}
                    alt={product?.name || "Product"}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="space-y-3 p-4">
                  <div>
                    <h2 className="line-clamp-1 font-semibold text-white">
                      {product?.name || "Product"}
                    </h2>

                    <p className="mt-1 text-xs text-gray-400">
                      {product?.vendor?.shopName || "Vendor"}
                    </p>
                  </div>

                  <p className="text-lg font-bold text-orange-400">
                    ৳{price}
                  </p>

                  <div className="flex gap-2">
                    <Link
                      href={`/products/${product?.slug || product?.id}`}
                      className="flex-1 rounded-lg bg-orange-500 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-orange-600"
                    >
                      View Product
                    </Link>

                    <button
                      onClick={() => handleRemove(product?.id)}
                      className="rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white hover:bg-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}