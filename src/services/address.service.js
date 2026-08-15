import axiosInstance from "@/lib/axiosInstance";

export const getMyAddressesApi = async () => {
  const res = await axiosInstance.get("/addresses");
  return res.data;
};

export const createAddressApi = async (payload) => {
  const res = await axiosInstance.post("/addresses", payload);
  return res.data;
};

export const updateAddressApi = async (id, payload) => {
  const res = await axiosInstance.patch(`/addresses/${id}`, payload);
  return res.data;
};

export const deleteAddressApi = async (id) => {
  const res = await axiosInstance.delete(`/addresses/${id}`);
  return res.data;
};