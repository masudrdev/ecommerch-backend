import api from "@/lib/axios";

export const vendorService = {
getDashboard: async (period = "7d") => {
  const res = await api.get("/vendors/dashboard", {
    params: { period },
  });
  return res.data;
},

  getProfile: async () => {
    const res = await api.get("/vendors/me");
    return res.data;
  },

 getOrders: async ({
  page = 1,
  limit = 10,
  search = "",
  status = "ALL",
  sort = "newest",
} = {}) => {
  const res = await api.get("/orders/vendor", {
    params: {
      page,
      limit,
      search,
      status,
      sort,
    },
  });

  return res.data;
},

  getOrderDetails: async (orderId) => {
    const res = await api.get(`/orders/vendor/${orderId}`);
    return res.data;
  },

  updateOrderItemStatus: async (itemId, itemStatus) => {
    const res = await api.patch(`/orders/vendor/items/${itemId}/status`, {
      itemStatus,
    });
    return res.data;
  },
  getSalesChart: async (period = "7d") => {
  const res = await api.get("/vendors/dashboard/sales-chart", {
    params: { period },
  });
  return res.data;
},
getAllVendors: async ({ status = "ALL", search = "" } = {}) => {
  const res = await api.get("/vendors", {
    params: { status, search },
  });
  return res.data;
},

updateVendorStatus: async (id, status) => {
  const res = await api.patch(`/vendors/${id}/status`, { status });
  return res.data;
},
addOrderNote: async (orderId, data) => {
  const res = await api.post(`/orders/vendor/orders/${orderId}/notes`, data);
  return res.data;
}





};