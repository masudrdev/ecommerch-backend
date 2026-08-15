"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { getCartApi } from "@/services/cartService";
import { clearCart, setCart } from "@/redux/features/cart/cartSlice";

export default function CartLoader() {
  const dispatch = useDispatch();

  useEffect(() => {
    const loadCart = async () => {
      const token =
        localStorage.getItem("accessToken") ||
        localStorage.getItem("token");

      if (!token) {
        dispatch(clearCart());
        return;
      }

      try {
        const res = await getCartApi();
        dispatch(setCart(res?.cart?.items || []));
      } catch (error) {
        console.log(error);
        dispatch(clearCart());
      }
    };

    loadCart();
  }, [dispatch]);

  return null;
}