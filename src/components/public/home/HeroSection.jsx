import Link from "next/link";
import { ArrowRight, BadgeCheck, PackageCheck, Truck } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="mx-auto max-w-7xl px-3 pt-5 sm:px-5">
      <div className="relative isolate overflow-hidden rounded-[24px] bg-slate-950 px-6 py-9 text-white md:px-12 md:py-12">
        <div className="absolute -right-24 -top-28 -z-10 h-80 w-80 rounded-full bg-orange-500/30 blur-3xl" />
        <div className="absolute bottom-0 right-0 -z-10 h-3/4 w-2/5 bg-gradient-to-tl from-orange-600/30 to-transparent" />
        <div className="max-w-2xl">
          <p className="mb-4 inline-flex rounded-full border border-orange-400/30 bg-orange-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-orange-300">Bangladesh&apos;s friendly marketplace</p>
          <h1 className="text-3xl font-black leading-[1.05] tracking-tight md:text-5xl">Better finds. <span className="text-orange-500">Friendlier prices.</span></h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300 md:text-base">Discover trusted products from local sellers, with simple ordering and delivery across Bangladesh.</p>
          <Link href="/products" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-3.5 font-bold text-white transition hover:bg-orange-500">Shop now <ArrowRight size={18} /></Link>
        </div>
      </div>
      <div className="relative z-10 mx-3 -mt-5 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 shadow-lg sm:grid-cols-3 md:mx-10">
        {[[Truck,"Nationwide delivery","Fast and reliable"],[BadgeCheck,"Trusted sellers","Quality checked"],[PackageCheck,"Easy shopping","Secure and simple"]].map(([Icon,title,text]) => <div key={title} className="flex items-center gap-3 bg-white p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><Icon size={20} /></span><div><p className="text-sm font-bold text-slate-800">{title}</p><p className="text-xs text-slate-400">{text}</p></div></div>)}
      </div>
    </section>
  );
}
