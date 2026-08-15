"use client";

import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";

import { authService } from "@/services/auth.service";
import { logoutUser } from "@/redux/features/authSlice";

export default function useLogout() {
  const router = useRouter();
  const dispatch = useDispatch();

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.log(error);
    } finally {
      dispatch(logoutUser());

      localStorage.removeItem("accessToken");

      toast.success("Logged out successfully");

      router.replace("/auth/login");
    }
  };

  return handleLogout;
}