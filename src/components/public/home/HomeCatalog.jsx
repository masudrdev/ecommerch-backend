"use client";

import Link from "next/link";
import { Zap } from "lucide-react";
import ProductCard from "@/components/public/product/ProductCard";

const productId = (product) => product?.id || product?._id;

function Countdown() {
  return (
    <div className="flex items-end gap-1.5 sm:gap-2">
      <span className="mb-5 hidden text-xs font-bold text-slate-700 sm:block">Sale Ends In</span>
      {[["02","Days"],["14","Hours"],["36","Mins"],["58","Secs"]].map(([value, label], index) => (
        <div key={label} className="flex items-start gap-1.5 sm:gap-2">
          <div className="text-center"><span className="flex h-8 min-w-8 items-center justify-center rounded-md bg-red-500 px-1.5 text-sm font-black text-white sm:h-10 sm:min-w-10 sm:text-base">{value}</span><span className="mt-1 block text-[8px] font-bold text-slate-500 sm:text-[9px]">{label}</span></div>
          {index < 3 && <span className="mt-1 font-black text-red-500">:</span>}
        </div>
      ))}
    </div>
  );
}

function ProductSection({ id, title, eyebrow, products, limit = 6, flash = false }) {
  if (!products.length) return null;
  return (
    <section id={id} className={`scroll-mt-36 py-7 ${flash ? "mt-5 rounded-2xl border border-red-100 bg-gradient-to-r from-red-50/70 via-white to-red-50/40 px-3 shadow-sm sm:px-5" : ""}`}>
      <div className={`mb-5 flex justify-between gap-3 ${flash ? "items-start sm:items-center" : "items-end"}`}>
        <div className="min-w-0">
          {eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-orange-600">{eyebrow}</p>}
          <h2 className={`flex items-center gap-2 font-black tracking-tight text-slate-900 ${flash ? "text-xl sm:text-2xl" : "text-2xl md:text-3xl"}`}>{flash && <Zap className="fill-red-500 text-red-500" size={23} />}{title}</h2>
          {flash && <p className="mt-1 hidden text-xs text-slate-500 sm:block">Limited time hot deals</p>}
        </div>
        {flash && <Countdown />}
        <Link href="/products" className="hidden shrink-0 rounded-lg border border-red-400 px-3 py-2 text-xs font-bold text-red-500 transition hover:bg-red-500 hover:text-white sm:block">View All</Link>
      </div>
      <div className={`grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 ${flash ? "lg:grid-cols-5" : "lg:grid-cols-3 xl:grid-cols-6"}`}>
        {products.slice(0, limit).map((product) => <ProductCard key={productId(product)} product={product} flash={flash} compact={flash} />)}
      </div>
      {flash && <Link href="/products" className="mt-4 block rounded-lg border border-red-400 px-3 py-2 text-center text-xs font-bold text-red-500 sm:hidden">View All Flash Sale</Link>}
    </section>
  );
}

export default function HomeCatalog({ products }) {
  const activeFlash = products.filter((product) => product.isFlashSaleActive ?? Boolean(product.salePrice || product.offerPrice));
  const reviewed = products.filter((product) => (product.reviews?.length || product.reviewCount || product._count?.reviews) > 0).sort((a, b) => (b.reviews?.length || b.reviewCount || 0) - (a.reviews?.length || a.reviewCount || 0));
  const featured = products.filter((product) => product.isFeatured || product.featured);
  const newest = [...products].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  if (!products.length) return <div className="mx-auto my-14 max-w-7xl px-5 text-center text-slate-500">No products found.</div>;

  return (
    <div className="mx-auto max-w-7xl px-3 pb-10 sm:px-5">
      <ProductSection id="flash-sale" title="Flash Sale" products={activeFlash.length ? activeFlash : products} limit={5} flash />
      <ProductSection id="best-sale" title="Best Selling" eyebrow="Reviewed by customers" products={reviewed} limit={6} />
      <ProductSection id="featured" title="Featured Products" eyebrow="Hand-picked for you" products={featured.length ? featured : products} limit={6} />
      <ProductSection id="new-arrivals" title="New Arrivals" eyebrow="Just landed" products={newest} limit={6} />
    </div>
  );
}
