"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Menu, Settings } from "lucide-react";
import { useSelector } from "react-redux";
import {
  getMyNotificationsApi,
  markNotificationAsReadApi,
} from "@/services/notification.service";

export default function DashboardTopbar({
  collapsed,
  setCollapsed,
  setMobileOpen,
}) {
  const { user } = useSelector((state) => state.auth);

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await getMyNotificationsApi();
      setNotifications(res?.notifications || []);
      setUnreadCount(res?.unreadCount || 0);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  const handleNotificationClick = async (item) => {
    if (!item.isRead) {
      await markNotificationAsReadApi(item.id);
      fetchNotifications();
    }
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#172033] px-3 py-3 sm:px-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg border border-white/10 p-2 hover:bg-white/10 lg:hidden"
          >
            <Menu size={20} />
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden rounded-lg border border-white/10 p-2 hover:bg-white/10 lg:block"
          >
            <Menu size={20} />
          </button>

          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-white sm:text-lg">
              Dashboard
            </h1>
            <p className="truncate text-xs text-gray-400">
              Welcome, {user?.name || "user"}
            </p>
          </div>
        </div>

        <div className="relative flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="relative rounded-lg border border-white/10 p-2 text-white hover:bg-white/10"
          >
            <Bell size={18} />

            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-12 w-[calc(100vw-24px)] max-w-80 overflow-hidden rounded-xl border border-white/10 bg-[#1E293B] shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <h2 className="font-semibold text-white">Notifications</h2>

                <Link
                  href="/dashboard/notifications"
                  onClick={() => setOpen(false)}
                  className="text-xs font-medium text-orange-400 hover:text-orange-300"
                >
                  View All
                </Link>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-sm text-gray-400">
                    No notifications found.
                  </div>
                ) : (
                  notifications.slice(0, 5).map((item) => (
                    <Link
                      key={item.id}
                      href={
                        item.link
                          ? item.link.replace("/customer", "/dashboard")
                          : "/dashboard/notifications"
                      }
                      onClick={() => handleNotificationClick(item)}
                      className={`block border-b border-white/10 px-4 py-3 hover:bg-white/5 ${
                        !item.isRead ? "bg-orange-500/10" : ""
                      }`}
                    >
                      <p className="text-sm font-semibold text-white">
                        {item.title || "Notification"}
                      </p>

                      <p className="mt-1 line-clamp-2 text-xs text-gray-300">
                        {item.message}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}

          <button className="hidden rounded-lg border border-white/10 p-2 text-white hover:bg-white/10 sm:block">
            <Settings size={18} />
          </button>

          <span className="hidden rounded-lg bg-[#1E293B] px-4 py-2 text-sm text-white md:block">
            {user?.role || "role"}
          </span>
        </div>
      </div>
    </header>
  );
}