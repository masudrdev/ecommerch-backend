import api from "@/lib/axios";

export const dashboardService = {
  getCustomerDashboard: async () => {
    const res = await api.get("/dashboard/customer");
    return res.data;
  },

  getSupportDashboard: async () => {
    const res = await api.get("/dashboard/support");
    return res.data;
  },

  getVendorDashboard: async () => {
    const res = await api.get("/vendors/dashboard");
    return res.data;
  },

  getAdminDashboard: async () => {
    const res = await api.get("/admin/dashboard");
    return res.data;
  },
};