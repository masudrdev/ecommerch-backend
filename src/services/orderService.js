import axiosInstance from "@/lib/axiosInstance";

export const checkoutOrderApi = async (payload) => {
  const res = await axiosInstance.post("/orders/checkout", payload);
  return res.data;
};
