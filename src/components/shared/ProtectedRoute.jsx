"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";

export default function ProtectedRoute({ children }) {
  const router = useRouter();
  const { user, accessToken } = useSelector((state) => state.auth);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = accessToken || localStorage.getItem("accessToken");

    if (!token) {
      router.replace("/auth/login");
      return;
    }

    setChecking(false);
  }, [accessToken, router]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B1120] text-white">
        Checking authentication...
      </div>
    );
  }

  return children;
}