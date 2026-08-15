"use client";

import Link from "next/link";
import Image from "next/image";
import { Clock3, ShoppingCart, Star } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { addToCartApi, getCartApi } from "@/services/cartService";
import { setCart } from "@/redux/features/cart/cartSlice";

export default function ProductCard({ product, flash = false, compact = false }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);
  const id = product?.id || product?._id;
  const image = product?.mainImage || product?.image || product?.images?.find?.((item) => item.isMain)?.url || product?.images?.[0]?.url || product?.images?.[0]?.imageUrl || product?.images?.[0] || "/placeholder.png";
  const price = product?.salePrice || product?.offerPrice || product?.finalPrice || product?.price || 0;
  const oldPrice = product?.salePrice || product?.offerPrice ? product?.price : product?.oldPrice;
  const reviews = product?.reviews || [];
  const reviewCount = product?.reviewCount ?? product?._count?.reviews ?? reviews.length;
  const rating = product?.averageRating ?? product?.rating ?? (reviews.length ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length : 0);
  const discount = oldPrice && Number(oldPrice) > Number(price) ? Math.round(((Number(oldPrice) - Number(price)) / Number(oldPrice)) * 100) : 0;

  const addToCart = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!id) return toast.error("Product not found");
    if (!user && !token) {
      toast.error("Please login first");
      router.push("/auth/login");
      return;
    }
    try {
      await addToCartApi({ productId: id, quantity: 1, color: null, size: null });
      const response = await getCartApi();
      dispatch(setCart(response?.cart?.items || []));
      toast.success("Product added to cart");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to add cart");
    }
  };

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <Link href={`/products/${product?.slug || id}`} className="relative block aspect-[4/4.2] overflow-hidden bg-slate-50">
        <Image src={image} alt={product?.name || "Product image"} fill className="object-contain p-4 transition duration-500 group-hover:scale-105" />
        {oldPrice && <span className={`absolute left-2 top-2 rounded-md px-2 py-1 text-[11px] font-black text-white ${flash ? "bg-red-500" : "bg-orange-600"}`}>{discount ? `-${discount}%` : "SALE"}</span>}
      </Link>
      <div className="flex flex-1 flex-col p-3.5">
        <Link href={`/products/${product?.slug || id}`} className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-slate-800 hover:text-orange-600">{product?.name}</Link>
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="min-w-0"><span className="font-extrabold text-orange-600">৳{Number(price).toLocaleString()}</span>{oldPrice && <span className="ml-1.5 text-[11px] text-slate-400 line-through">৳{Number(oldPrice).toLocaleString()}</span>}</div>
          {reviewCount > 0 && <span className="flex shrink-0 items-center gap-1 text-[11px] text-slate-500 sm:text-xs"><Star size={13} className="fill-amber-400 text-amber-400" />{Number(rating).toFixed(1)} ({reviewCount})</span>}
        </div>
        <div className="mt-auto flex items-center gap-2 border-t border-slate-100 pt-3">
          {flash && <span className="flex min-w-0 flex-1 items-center gap-1 text-[10px] font-semibold text-red-500 sm:text-xs"><Clock3 size={13} />{product.flashSaleEnd ? <time className="truncate" dateTime={product.flashSaleEnd}>{new Date(product.flashSaleEnd).toLocaleString("en-BD", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</time> : <span>{compact ? "01:45:30" : "Limited time"}</span>}</span>}
          <button type="button" onClick={addToCart} aria-label="Add to cart" className={`ml-auto flex items-center justify-center rounded-lg bg-slate-900 font-bold text-white hover:bg-orange-600 ${compact ? "h-8 w-8" : "gap-1.5 px-3 py-2 text-xs"}`}><ShoppingCart size={15} />{!compact && <span className="hidden sm:inline">Add</span>}</button>
        </div>
      </div>
    </article>
  );
}
