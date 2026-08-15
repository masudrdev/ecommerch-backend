"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { authService } from "@/services/auth.service";
import { setUser, logoutUser } from "@/redux/features/authSlice";

export default function AuthLoader({ children }) {
  const dispatch = useDispatch();

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem("accessToken");

      if (!token) return;

      try {
        const res = await authService.getMe();
        const user = res?.data?.user || res?.data || res?.user;
        dispatch(setUser(user));
      } catch {
        dispatch(logoutUser());
      }
    };

    loadUser();
  }, [dispatch]);

  return children;
}