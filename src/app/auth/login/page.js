"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { authService } from "@/services/auth.service";
import { setCredentials, setAuthLoading } from "@/redux/features/authSlice";

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useDispatch();

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    emailOrUsername: "",
    password: "",
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

    if (!formData.emailOrUsername || !formData.password) {
      toast.error("Email/username and password are required");
      return;
    }

    try {
      setLoading(true);
      dispatch(setAuthLoading(true));

      const res = await authService.login(formData);

const accessToken = res?.data?.accessToken || res?.accessToken;
const refreshToken = res?.data?.refreshToken || res?.refreshToken;
const user = res?.data?.user || res?.user;

      if (!accessToken) {
        toast.error("Access token not found");
        return;
      }

dispatch(
  setCredentials({
    user,
    accessToken,
    refreshToken,
  })
);

      toast.success("Login successful");
      router.push("/dashboard");
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error?.message || "Login failed"
      );
    } finally {
      setLoading(false);
      dispatch(setAuthLoading(false));
    }
  };

  return (
    <main className="min-h-screen bg-[#0F0F0F] px-4 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl border border-orange-500/20 bg-[#171717] shadow-2xl shadow-orange-500/10 lg:grid-cols-2">
          <div className="hidden bg-gradient-to-br from-[#111111] via-[#1C1C1C] to-orange-700 p-10 lg:flex lg:flex-col lg:justify-between">
            <div>
              <Link href="/" className="text-3xl font-extrabold">
                <span className="text-white">Friend</span>
                <span className="text-orange-500">Bazar</span>
              </Link>

              <h1 className="mt-16 text-4xl font-bold leading-tight">
                Manage your marketplace with confidence.
              </h1>

              <p className="mt-5 text-orange-100">
                Login to manage products, orders, vendors, payouts, support
                tickets and business analytics.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5 backdrop-blur">
              <p className="text-sm text-orange-100">
                Built for Customer, Vendor, Admin, Super Admin and Support Agent
                roles.
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            <div className="mb-8">
              <Link
                href="/"
                className="text-2xl font-extrabold lg:hidden"
              >
                <span className="text-white">Friend</span>
                <span className="text-orange-500">Bazar</span>
              </Link>

              <h2 className="mt-6 text-3xl font-bold">Welcome back</h2>
              <p className="mt-2 text-sm text-gray-400">
                Sign in to continue to your dashboard.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Email or Username
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500"
                  />

                  <input
                    type="text"
                    name="emailOrUsername"
                    value={formData.emailOrUsername}
                    onChange={handleChange}
                    placeholder="Enter email or username"
                    className="w-full rounded-xl border border-white/10 bg-[#0F0F0F] py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-gray-500 focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Password
                </label>

                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500"
                  />

                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter password"
                    className="w-full rounded-xl border border-white/10 bg-[#0F0F0F] py-3 pl-11 pr-12 text-sm outline-none transition placeholder:text-gray-500 focus:border-orange-500"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-gray-400">
                  <input
                    type="checkbox"
                    className="rounded accent-orange-500"
                  />
                  Remember me
                </label>

                <Link
                  href="/auth/forgot-password"
                  className="text-orange-500 hover:text-orange-400"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-400">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/register"
                className="text-orange-500 hover:text-orange-400"
              >
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}