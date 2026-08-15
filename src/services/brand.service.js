import api from "@/lib/axios";

export const brandService = {
  getBrands: async () => {
    const res = await api.get("/brands");
    return res.data;
  },

  createBrand: async (payload) => {
    const res = await api.post("/brands", payload);
    return res.data;
  },

  updateBrand: async (id, payload) => {
    const res = await api.put(`/brands/${id}`, payload);
    return res.data;
  },

  deleteBrand: async (id) => {
    const res = await api.delete(`/brands/${id}`);
    return res.data;
  },
};