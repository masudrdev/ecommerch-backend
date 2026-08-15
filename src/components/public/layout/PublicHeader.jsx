"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CartIcon from "./CartIcon";
import Link from "next/link";
import { ChevronDown, ChevronRight, Menu, Search, Store } from "lucide-react";
import { useSelector } from "react-redux";

function NestedCategory({ item, selected, onSelect, depth = 0 }) {
  const [open, setOpen] = useState(false);
  const children = item.children || [];
  return (
    <div>
      <div className="flex items-center" style={{ paddingLeft: `${depth * 12}px` }}>
        <button type="button" onClick={() => setOpen((value) => !value)} className="flex h-9 w-8 shrink-0 items-center justify-center text-slate-400" aria-label={`${open ? "Collapse" : "Expand"} ${item.name}`}>
          {children.length > 0 && (open ? <ChevronDown size={15} /> : <ChevronRight size={15} />)}
        </button>
        <button type="button" onClick={() => onSelect(item)} className={`flex-1 rounded-lg px-2 py-2 text-left text-sm ${selected === item.slug ? "bg-orange-50 font-bold text-orange-600" : "text-slate-700 hover:bg-slate-50"}`}>{item.name}</button>
      </div>
      {open && children.map((child) => <NestedCategory key={child.id} item={child} selected={selected} onSelect={onSelect} depth={depth + 1} />)}
    </div>
  );
}

export default function PublicHeader({ categories = [] }) {
  const router = useRouter();
  const user = useSelector((state) => state.auth.user);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [categoryName, setCategoryName] = useState("All Categories");
  const [categoryOpen, setCategoryOpen] = useState(false);

  const selectCategory = (item) => {
    setCategory(item?.slug || "");
    setCategoryName(item?.name || "All Categories");
    setCategoryOpen(false);
  };
  const submitSearch = (event) => {
    event.preventDefault();
    const query = new URLSearchParams();
    if (search.trim()) query.set("search", search.trim());
    if (category) query.set("category", category);
    router.push(`/products${query.size ? `?${query.toString()}` : ""}`);
  };

  const categoryMenu = (
    <div className="absolute right-0 top-[calc(100%+8px)] z-50 max-h-96 w-[min(320px,calc(100vw-24px))] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-2xl">
      <button type="button" onClick={() => selectCategory(null)} className={`w-full rounded-lg px-4 py-2.5 text-left text-sm ${!category ? "bg-orange-50 font-bold text-orange-600" : "text-slate-700"}`}>All Categories</button>
      {categories.map((item) => <NestedCategory key={item.id} item={item} selected={category} onSelect={selectCategory} />)}
    </div>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-3 sm:gap-3 sm:px-5">
        <button type="button" className="rounded-lg border p-2 md:hidden" aria-label="Open menu"><Menu size={20} /></button>
        <Link href="/" className="flex shrink-0 items-center gap-2 text-lg font-black tracking-tight text-slate-900 sm:text-xl"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-600 text-white"><Store size={19} /></span><span className="hidden sm:inline">Friend<span className="text-orange-600">Bazar</span></span></Link>

        <form onSubmit={submitSearch} className="hidden min-w-0 flex-1 overflow-visible rounded-xl border border-slate-200 bg-slate-50 md:flex">
          <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Search for products..." className="min-w-0 flex-1 rounded-l-xl bg-transparent px-4 py-2.5 text-sm outline-none" />
          <div className="relative border-l border-slate-200 bg-white">
            <button type="button" onClick={() => setCategoryOpen((value) => !value)} className="flex h-full w-40 items-center justify-between gap-2 px-3 text-sm font-semibold"><span className="truncate">{categoryName}</span><ChevronDown size={15} /></button>
            {categoryOpen && categoryMenu}
          </div>
          <button type="submit" aria-label="Search" className="rounded-r-xl bg-orange-600 px-5 text-white hover:bg-orange-500"><Search size={18} /></button>
        </form>

        <CartIcon />
        {user ? <div className="flex items-center gap-2"><span className="hidden text-sm font-medium xl:block">{user.name}</span><Link href="/dashboard" className="rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white sm:text-sm">Dashboard</Link></div> : <Link href="/auth/login" className="rounded-lg border px-3 py-2 text-sm">Login</Link>}
      </div>

      <form onSubmit={submitSearch} className="mx-3 mb-3 flex overflow-visible rounded-xl border bg-slate-50 md:hidden">
        <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Search products..." className="min-w-0 flex-1 rounded-l-xl bg-transparent px-3 py-2 text-sm outline-none" />
        <div className="relative border-l bg-white"><button type="button" onClick={() => setCategoryOpen((value) => !value)} className="flex h-full w-28 items-center justify-between gap-1 px-2 text-xs"><span className="truncate">{categoryName}</span><ChevronDown size={13} /></button>{categoryOpen && categoryMenu}</div>
        <button type="submit" className="rounded-r-xl bg-orange-600 px-4 text-white" aria-label="Search"><Search size={17} /></button>
      </form>

      <nav className="border-t border-slate-100"><div className="mx-auto flex max-w-7xl gap-5 overflow-x-auto px-3 py-2.5 text-sm font-medium text-slate-600 sm:px-5"><Link href="/" className="shrink-0 font-semibold text-orange-600">Home</Link><Link href="/products" className="shrink-0">Shop</Link><Link href="/#flash-sale" className="shrink-0">Flash Sale</Link><Link href="/#best-sale" className="shrink-0">Best Sale</Link><Link href="/#featured" className="shrink-0">Featured</Link><Link href="/#new-arrivals" className="shrink-0">New Arrivals</Link><Link href="/track-order" className="shrink-0">Track Order</Link><Link href="/about-us" className="shrink-0">About</Link><Link href="/contact-us" className="shrink-0">Contact</Link></div></nav>
    </header>
  );
}
