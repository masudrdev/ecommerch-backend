import api from "@/lib/axios";

export const userManagementService = {
  getUsers: async (group, { search = "", status = "ALL" } = {}) => (await api.get(`/user-management/${group}`, { params: { search, status } })).data,
  updateStatus: async (id, status) => (await api.patch(`/user-management/users/${id}/status`, { status })).data,
  updateVendorCommission: async (id, payload) => (await api.patch(`/user-management/vendors/${id}/commission`, payload)).data,
};
