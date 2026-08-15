import axiosInstance from "@/lib/axiosInstance";

export const getMyWishlistApi = async () => {
  const res = await axiosInstance.get("/wishlist");
  return res.data;
};

export const addToWishlistApi = async (productId) => {
  const res = await axiosInstance.post(`/wishlist/${productId}`);
  return res.data;
};

export const removeFromWishlistApi = async (productId) => {
  const res = await axiosInstance.delete(`/wishlist/${productId}`);
  return res.data;
};