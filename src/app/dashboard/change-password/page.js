"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { updatePasswordApi } from "@/services/profile.service";

export default function ChangePasswordPage() {
  const [formData, setFormData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("New password and confirm password do not match");
      return;
    }

    if (formData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);

      await updatePasswordApi({
        oldPassword: formData.oldPassword,
        newPassword: formData.newPassword,
      });

      toast.success("Password updated successfully");

      setFormData({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Password update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Change Password</h1>
        <p className="mt-1 text-sm text-gray-400">
          Update your account password securely.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl bg-[#1E293B] p-5 shadow-sm"
      >
        <div className="space-y-4">
          <input
            type="password"
            name="oldPassword"
            value={formData.oldPassword}
            onChange={handleChange}
            required
            placeholder="Current Password"
            className="w-full rounded-lg border border-slate-700 bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-orange-500"
          />

          <input
            type="password"
            name="newPassword"
            value={formData.newPassword}
            onChange={handleChange}
            required
            placeholder="New Password"
            className="w-full rounded-lg border border-slate-700 bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-orange-500"
          />

          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            placeholder="Confirm New Password"
            className="w-full rounded-lg border border-slate-700 bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-orange-500"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-orange-500 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </div>
      </form>
    </div>
  );
}