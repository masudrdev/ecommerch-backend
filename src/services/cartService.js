import axiosInstance from "@/lib/axiosInstance";

export const addToCartApi = async ({ productId, quantity, color, size }) => {
  const res = await axiosInstance.post("/cart", {
    productId,
    quantity,
    color,
    size,
  });

  return res.data;
};

export const getCartApi = async () => {
  const res = await axiosInstance.get("/cart");
  return res.data;
};

export const updateCartItemApi = async (itemId, payload) => {
  const res = await axiosInstance.patch(`/cart/${itemId}`, payload);
  return res.data;
};

export const removeCartItemApi = async (itemId) => {
  const res = await axiosInstance.delete(`/cart/${itemId}`);
  return res.data;
};