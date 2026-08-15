"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, Lock } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { authService } from "@/services/auth.service";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
const code =
  searchParams.get("code") || searchParams.get("otp") || "";
  const email = searchParams.get("email") || "";
  const otp = searchParams.get("otp") || "";

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();

    if (!email || !code || !password) {
      toast.error("Email, OTP and new password are required");
      return;
    }

    try {
      setLoading(true);

      await authService.resetPassword({
        email,
        code,
        newPassword: password,
      });

      toast.success("Password reset successful");
      router.push("/auth/login");
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Password reset failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0B0B] px-4 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-md items-center justify-center">
        <div className="w-full rounded-3xl border border-orange-500/20 bg-[#111111] p-6 shadow-2xl sm:p-8">
          <Link
            href="/auth/forgot-password"
            className="mb-8 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-orange-500"
          >
            <ArrowLeft size={16} />
            Back
          </Link>

          <div className="mb-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
              <Lock size={34} />
            </div>

            <h2 className="mt-6 text-3xl font-bold">New Password</h2>
            <p className="mt-2 text-sm text-gray-400">
              Create a new secure password.
            </p>
          </div>

          <form onSubmit={handleReset} className="space-y-5">
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500"
              />

              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full rounded-xl border border-white/10 bg-[#0B0B0B] py-3 pl-11 pr-12 text-sm outline-none focus:border-orange-500"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              disabled={loading}
              className="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-black hover:bg-orange-400 disabled:opacity-60"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}