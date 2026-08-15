import axiosInstance from "@/lib/axiosInstance";

export const checkoutOrderApi = async (payload) => {
  const res = await axiosInstance.post("/orders/checkout", payload);
  return res.data;
};

export const getMyOrdersApi = async () => {
  const res = await axiosInstance.get("/orders/my-orders");
  return res.data;
};
export const getOrderDetailsApi = async (id) => {
  const res = await axiosInstance.get(`/orders/${id}`);
  return res.data;
};
export const cancelMyOrderApi = async (id) => {
  const res = await axiosInstance.patch(`/orders/${id}/cancel`);
  return res.data;
};