"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, Lock, Mail, User, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { authService } from "@/services/auth.service";

export default function RegisterPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    phone: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.username || !formData.email || !formData.password) {
      toast.error("Name, username, email and password are required");
      return;
    }

    try {
      setLoading(true);

      await authService.register(formData);

      toast.success("Account created. Please verify your email.");
      router.push(`/auth/verify-email?email=${formData.email}`);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0B0B] px-4 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl border border-orange-500/20 bg-[#111111] shadow-2xl lg:grid-cols-2">
          <div className="hidden bg-gradient-to-br from-[#af662d] via-[#492e17] to-[#3f1212] p-10 lg:flex lg:flex-col lg:justify-between">
            <div>
              <Link href="/" className="text-3xl font-extrabold text-black">
                Friend<span className="text-white">Bazar</span>
              </Link>

              <h1 className="mt-16  text-4xl font-bold leading-tight text-white">
                Start your shopping journey with FriendBazar.
              </h1>

              <p className="mt-5 max-w-md text-white p-4 rounded-3xl bg-black/20 ">
                Create your account to order products, manage wishlist, track
                orders and connect with support.
              </p>
            </div>

            <div className="rounded-2xl bg-black/20 p-5 backdrop-blur">
              <p className="text-sm text-white">
                Secure account, verified email, smooth shopping experience.
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            <div className="mb-8">
              <Link href="/" className="text-3xl font-extrabold lg:hidden">
                <span className="text-white">Friend</span>
                <span className="text-orange-500">Bazar</span>
              </Link>

              <h2 className="mt-6 text-3xl font-bold">Create account</h2>
              <p className="mt-2 text-sm text-gray-400">
                Register to continue with FriendBazar.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <InputField
                icon={<User size={18} />}
                label="Full Name"
                name="name"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
              />

              <InputField
                icon={<User size={18} />}
                label="Username"
                name="username"
                placeholder="Choose a username"
                value={formData.username}
                onChange={handleChange}
              />

              <InputField
                icon={<Mail size={18} />}
                label="Email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
              />

              <InputField
                icon={<Phone size={18} />}
                label="Phone"
                name="phone"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={handleChange}
              />

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
                    placeholder="Create password"
                    className="w-full rounded-xl border border-white/10 bg-[#0B0B0B] py-3 pl-11 pr-12 text-sm outline-none transition placeholder:text-gray-500 focus:border-orange-500"
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

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-400">
              Already have an account?{" "}
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

function InputField({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-gray-300">{label}</label>

      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500">
          {icon}
        </span>

        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full rounded-xl border border-white/10 bg-[#0B0B0B] py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-gray-500 focus:border-orange-500"
        />
      </div>
    </div>
  );
}