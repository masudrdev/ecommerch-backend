"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  getMyNotificationsApi,
  markNotificationAsReadApi,
  markAllNotificationsAsReadApi,
  deleteNotificationApi,
} from "@/services/notification.service";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await getMyNotificationsApi();
      setNotifications(res?.notifications || []);
      setUnreadCount(res?.unreadCount || 0);
    } catch (error) {
      console.error("Notification fetch error:", error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await markNotificationAsReadApi(id);
      fetchNotifications();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to mark as read");
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsAsReadApi();
      toast.success("All notifications marked as read");
      fetchNotifications();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update");
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Delete this notification?");
    if (!confirmDelete) return;

    try {
      await deleteNotificationApi(id);
      toast.success("Notification deleted");
      fetchNotifications();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Delete failed");
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold text-white">Notifications</h1>
        <div className="h-64 animate-pulse rounded-xl bg-[#1E293B]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="mt-1 text-sm text-gray-400">
            You have {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          >
            Mark All Read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl bg-[#1E293B] p-6 text-center text-sm text-gray-300">
          No notifications found.
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border p-4 ${
                item.isRead
                  ? "border-slate-700 bg-[#1E293B]"
                  : "border-orange-500/40 bg-orange-500/10"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-semibold text-white">
                    {item.title || "Notification"}
                  </h2>

                  <p className="mt-1 text-sm text-gray-300">
                    {item.message}
                  </p>

                  <p className="mt-2 text-xs text-gray-500">
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleString("en-BD")
                      : ""}
                  </p>

                  {item.link && (
                    <Link
                      href={item.link.replace("/customer", "/dashboard")}
                      className="mt-3 inline-block text-sm font-medium text-orange-400 hover:text-orange-300"
                    >
                      View Details
                    </Link>
                  )}
                </div>

                <div className="flex gap-2">
                  {!item.isRead && (
                    <button
                      onClick={() => handleMarkAsRead(item.id)}
                      className="rounded-lg bg-green-500 px-3 py-2 text-xs font-semibold text-white hover:bg-green-600"
                    >
                      Mark Read
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}