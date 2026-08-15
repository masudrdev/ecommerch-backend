"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { authService } from "@/services/auth.service";

export default function VerifyResetOtpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();

    if (!email || !otp) {
      toast.error("Email and OTP are required");
      return;
    }

    try {
      setLoading(true);

      await authService.verifyResetOtp({ email, code: otp });

      toast.success("OTP verified");
      router.push(`/auth/reset-password?email=${email}&otp=${otp}`);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "OTP verification failed"
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
              <ShieldCheck size={34} />
            </div>

            <h2 className="mt-6 text-3xl font-bold">Verify OTP</h2>
            <p className="mt-2 text-sm text-gray-400">
              Enter the OTP sent to your email.
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-5">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full rounded-xl border border-white/10 bg-[#0B0B0B] px-4 py-3 text-sm outline-none focus:border-orange-500"
            />

            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter OTP"
              maxLength={6}
              className="w-full rounded-xl border border-white/10 bg-[#0B0B0B] px-4 py-3 text-center text-lg tracking-[0.4em] outline-none focus:border-orange-500"
            />

            <button
              disabled={loading}
              className="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-black hover:bg-orange-400 disabled:opacity-60"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}