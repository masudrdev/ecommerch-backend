"use client";

import Link from "next/link";
import { useState } from "react";
import { MailCheck, RefreshCcw, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { authService } from "@/services/auth.service";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const emailFromQuery = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailFromQuery);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();

    if (!email || !code) {
      toast.error("Email and verification code are required");
      return;
    }

    try {
      setLoading(true);

      await authService.verifyEmail({
        email,
        code,
      });

      toast.success("Email verified successfully");
      router.push("/auth/login");
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Email verification failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      toast.error("Please enter your email first");
      return;
    }

    try {
      setResending(true);

      await authService.resendVerificationCode({
        email,
      });

      toast.success("Verification code resent");
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to resend code"
      );
    } finally {
      setResending(false);
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
                Verify your email to secure your account.
              </h1>

              <p className="mt-5 max-w-md text-black/80">
                Enter the verification code sent to your email address to
                activate your FriendBazar account.
              </p>
            </div>

            <div className="rounded-2xl bg-black/20 p-5 backdrop-blur">
              <p className="text-sm text-white">
                Verified accounts help keep FriendBazar safe for customers,
                vendors and admins.
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            <div className="mb-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
                <MailCheck size={34} />
              </div>

              <h2 className="mt-6 text-3xl font-bold">Verify Email</h2>
              <p className="mt-2 text-sm text-gray-400">
                Check your inbox and enter the code below.
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Email Address
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full rounded-xl border border-white/10 bg-[#0B0B0B] px-4 py-3 text-sm outline-none transition placeholder:text-gray-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Verification Code
                </label>

                <div className="relative">
                  <ShieldCheck
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500"
                  />

                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Enter 6 digit code"
                    maxLength={6}
                    className="w-full rounded-xl border border-white/10 bg-[#0B0B0B] py-3 pl-11 pr-4 text-center text-lg tracking-[0.4em] outline-none transition placeholder:text-sm placeholder:tracking-normal placeholder:text-gray-500 focus:border-orange-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Verifying..." : "Verify Email"}
              </button>
            </form>

            <button
              type="button"
              onClick={handleResendCode}
              disabled={resending}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-orange-500/40 py-3 text-sm text-orange-500 transition hover:bg-orange-500 hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw size={16} />
              {resending ? "Resending..." : "Resend Code"}
            </button>

            <p className="mt-6 text-center text-sm text-gray-400">
              Already verified?{" "}
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