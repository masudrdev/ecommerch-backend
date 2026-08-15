import api from "@/lib/axios";

export const payoutService = {
  getMySummary: async () => {
    const response = await api.get("/payouts/summary");
    return response.data;
  },

  getMyRequests: async () => {
    const response = await api.get("/payouts/my-requests");
    return response.data;
  },

  requestPayout: async (payload) => {
    const response = await api.post("/payouts/request", payload);
    return response.data;
  },

  cancelPayout: async (payoutId) => {
    const response = await api.patch(`/payouts/${payoutId}/cancel`);
    return response.data;
  },

  getAdminSummary: async () => {
    const response = await api.get("/payouts/admin/summary");
    return response.data;
  },

  getAllPayouts: async (params = {}) => {
    const response = await api.get("/payouts/admin/all", {
      params,
    });

    return response.data;
  },

  approvePayout: async (payoutId, payload = {}) => {
    const response = await api.patch(
      `/payouts/${payoutId}/approve`,
      payload
    );

    return response.data;
  },

  rejectPayout: async (payoutId, payload) => {
    const response = await api.patch(
      `/payouts/${payoutId}/reject`,
      payload
    );

    return response.data;
  },

  markPayoutPaid: async (payoutId, payload) => {
    const response = await api.patch(
      `/payouts/${payoutId}/mark-paid`,
      payload
    );

    return response.data;
  },
};