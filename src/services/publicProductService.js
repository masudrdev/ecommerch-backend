import axiosInstance from "@/lib/axiosInstance";

export const getPublicProducts = async (params = {}) => {
  const res = await axiosInstance.get("/products", {
    params: { limit: 100, sort: "latest", ...params },
  });
  return res.data;
};

export const getFeaturedProducts = async () => {
  const res = await axiosInstance.get("/products");
  return res.data;
};

export const getPublicProductBySlug = async (slug) => {
  const res = await axiosInstance.get(
    `http://localhost:5000/api/products/${slug}`
  );
  return res.data;
};
