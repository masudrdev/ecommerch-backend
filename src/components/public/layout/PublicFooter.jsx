import Link from "next/link";
import { Mail, MapPin, Phone, Store } from "lucide-react";

export default function PublicFooter() {
  return (
    <footer className="mt-12 bg-slate-950 text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1.3fr]">
        <div>
          <Link href="/" className="flex items-center gap-2 text-2xl font-black"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600"><Store size={20} /></span>Friend<span className="-ml-2 text-orange-500">Bazar</span></Link>
          <p className="mt-5 max-w-sm text-sm leading-7 text-slate-400">Your friendly online marketplace for trusted products, dependable sellers and delivery throughout Bangladesh.</p>
          <div className="mt-5 space-y-2 text-sm text-slate-400"><p className="flex items-center gap-2"><Phone size={15} /> Customer support</p><p className="flex items-center gap-2"><Mail size={15} /> support@friendbazar.com</p><p className="flex items-center gap-2"><MapPin size={15} /> Bangladesh</p></div>
        </div>
        <div>
          <h3 className="font-bold">Customer Service</h3>
          <div className="mt-5 grid gap-3 text-sm text-slate-400"><Link href="/track-order">Track Order</Link><Link href="/dashboard/support">Help & Support</Link><Link href="/contact-us">Contact Us</Link><span>Returns & Refunds</span><span>Shipping Policy</span></div>
        </div>
        <div>
          <h3 className="font-bold">Get offers in your inbox</h3>
          <p className="mt-4 text-sm leading-6 text-slate-400">Subscribe for new arrivals, special prices and marketplace updates.</p>
          <form className="mt-5 flex overflow-hidden rounded-xl border border-slate-700 bg-slate-900"><input type="email" aria-label="Email address" placeholder="Your email address" className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm outline-none" /><button type="submit" className="bg-orange-600 px-5 text-sm font-bold">Subscribe</button></form>
          <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-400"><span className="rounded-md border border-slate-700 px-3 py-2">Cash on Delivery</span><span className="rounded-md border border-slate-700 px-3 py-2">Secure Payment</span><span className="rounded-md border border-slate-700 px-3 py-2">Privacy Protected</span></div>
        </div>
      </div>
      <div className="border-t border-slate-800"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-2 px-5 py-5 text-xs text-slate-500 sm:flex-row"><p>© 2026 FriendBazar. All rights reserved.</p><p>Privacy · Terms · Cookies</p></div></div>
    </footer>
  );
}
