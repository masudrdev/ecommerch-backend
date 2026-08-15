import axiosInstance from "@/lib/axiosInstance";

export const updateMyProfileApi = async (payload) => {
  const res = await axiosInstance.patch("/auth/profile", payload);
  return res.data;
};
export const updatePasswordApi = async (payload) => {
  const res = await axiosInstance.patch("/auth/update-password", payload);
  return res.data;
};