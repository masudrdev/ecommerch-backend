import axiosInstance from "@/lib/axiosInstance";

export const getPublicCategories = async () => {
  const res = await axiosInstance.get("/categories");
  return res.data;
};