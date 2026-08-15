"use client";

import Link from "next/link";
import { useSelector } from "react-redux";
import useLogout from "@/hooks/useLogout";
import { usePathname } from "next/navigation";
import { ChevronDown, Globe, LogOut, X } from "lucide-react";
import { useEffect, useState } from "react";
import { sidebarConfig } from "@/config/sidebarConfig";
import { ROLES } from "@/constants/roles";

export default function DashboardSidebar({
  collapsed,
  mobileOpen,
  setMobileOpen,
}) {
  const pathname = usePathname();
  const handleLogout = useLogout();
  const { user } = useSelector((state) => state.auth);

  const role = user?.role || ROLES.CUSTOMER;
  const groups = sidebarConfig[role] || sidebarConfig[ROLES.CUSTOMER];

  const getActiveGroup = () => {
    const activeGroup = groups.find((group) =>
      group.items.some((item) => pathname === item.href)
    );
    return activeGroup?.group || "Main";
  };

  const [openGroup, setOpenGroup] = useState(getActiveGroup());

  useEffect(() => {
    setOpenGroup(getActiveGroup());
    setMobileOpen?.(false);
  }, [pathname]);

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-screen flex-col bg-[#172033] transition-all duration-300
      ${collapsed ? "lg:w-20" : "lg:w-64"}
      ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      w-72 max-w-[85vw]`}
    >
      <div className="flex items-center justify-between border-b border-white/10 p-5">
<Link href="/dashboard" className="block text-xl font-bold text-white">
  {collapsed ? (
    <>
      <span className="hidden lg:inline">D</span>
      <span className="lg:hidden">Dashboard</span>
    </>
  ) : (
    <span>Dashboard</span>
  )}
</Link>

        <button
          className="rounded-lg border border-white/10 p-2 lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        {groups.map((group) => {
          const GroupIcon = group.icon;
          const isOpen = openGroup === group.group;

          return (
            <div key={group.group} className="mb-2">
              <button
                onClick={() => setOpenGroup(isOpen ? "" : group.group)}
                className={`flex w-full items-center rounded-lg px-3 py-2 text-sm text-gray-300 transition hover:bg-white/10 hover:text-white ${
                  collapsed ? "lg:justify-center" : "justify-between"
                }`}
              >
                <span className="flex items-center gap-3">
                  <GroupIcon size={18} />
                  <span className={collapsed ? "lg:hidden" : ""}>
                    {group.group}
                  </span>
                </span>

                <ChevronDown
                  size={16}
                  className={`transition-transform ${
                    isOpen ? "rotate-180" : ""
                  } ${collapsed ? "lg:hidden" : ""}`}
                />
              </button>

              {isOpen && (
                <div
                  className={`mt-1 space-y-1 pl-6 ${
                    collapsed ? "lg:hidden" : ""
                  }`}
                >
                  {group.items.map((item) => {
                    const ItemIcon = item.icon;
                    const active = pathname === item.href;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                          active
                            ? "bg-blue-600 text-white"
                            : "text-gray-400 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <ItemIcon size={16} />
                        <span>{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-white/10 p-3">
        <Link
          href="/"
          className={`flex items-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 ${
            collapsed ? "lg:justify-center" : "justify-center gap-2"
          }`}
        >
          <Globe size={18} />
          <span className={collapsed ? "lg:hidden" : ""}>Visit Website</span>
        </Link>

        <button
          className={`flex w-full items-center rounded-lg border border-red-500 px-3 py-2 text-sm text-red-400 hover:bg-red-500 hover:text-white ${
            collapsed ? "lg:justify-center" : "justify-center gap-2"
          }`}
          onClick={handleLogout}
        >
          <LogOut size={18} />
          <span className={collapsed ? "lg:hidden" : ""}>Logout</span>
        </button>
      </div>
    </aside>
  );
}