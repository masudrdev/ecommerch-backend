"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail, ArrowLeft, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { authService } from "@/services/auth.service";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.error("Email is required");
      return;
    }

    try {
      setLoading(true);

      await authService.forgotPassword({ email });

      toast.success("Reset OTP sent to your email");
      router.push(`/auth/verify-reset-otp?email=${email}`);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to send reset OTP"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0B0B] px-4 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl border border-orange-500/20 bg-[#111111] shadow-2xl lg:grid-cols-2">
          <div className="hidden bg-gradient-to-br from-[#FF7A00] via-[#F97316] to-[#111111] p-10 lg:flex lg:flex-col lg:justify-between">
            <div>
              <Link href="/" className="text-3xl font-extrabold text-black">
                Friend<span className="text-white">Bazar</span>
              </Link>

              <h1 className="mt-16 text-4xl font-bold leading-tight text-black">
                Forgot your password?
              </h1>

              <p className="mt-5 max-w-md text-black/80">
                No worries. Enter your email and we will send a reset OTP to
                help you recover your account.
              </p>
            </div>

            <div className="rounded-2xl bg-black/20 p-5 backdrop-blur">
              <p className="text-sm text-white">
                Your FriendBazar account security is our priority.
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            <Link
              href="/auth/login"
              className="mb-8 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-orange-500"
            >
              <ArrowLeft size={16} />
              Back to login
            </Link>

            <div className="mb-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
                <KeyRound size={34} />
              </div>

              <h2 className="mt-6 text-3xl font-bold">Reset Password</h2>
              <p className="mt-2 text-sm text-gray-400">
                Enter your email to receive reset OTP.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Email Address
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500"
                  />

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full rounded-xl border border-white/10 bg-[#0B0B0B] py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-gray-500 focus:border-orange-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Sending OTP..." : "Send Reset OTP"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-400">
              Remember password?{" "}
              <Link href="/auth/login" className="text-orange-500 hover:text-orange-400">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}