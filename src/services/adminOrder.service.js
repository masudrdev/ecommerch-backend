import api from "@/lib/axios";

export const adminOrderService = {
  /**
   * Admin/Super Admin একটি order-এর full details দেখবে।
   */
  getOrderDetails: async (orderId) => {
    if (!orderId) {
      throw new Error("Order ID is required");
    }

    const res = await api.get(`/orders/${orderId}`);

    return res.data;
  },

  /**
   * Admin/Super Admin সম্পূর্ণ order status change করবে।
   */
  updateOrderStatus: async (orderId, status) => {
    if (!orderId) {
      throw new Error("Order ID is required");
    }

    if (!status) {
      throw new Error("Order status is required");
    }

    const res = await api.patch(`/orders/${orderId}/status`, {
      status,
    });

    return res.data;
  },

  /**
   * Admin/Super Admin নির্দিষ্ট product/item status change করবে।
   */
  updateOrderItemStatus: async (itemId, itemStatus) => {
    if (!itemId) {
      throw new Error("Order item ID is required");
    }

    if (!itemStatus) {
      throw new Error("Item status is required");
    }

    const res = await api.patch(
      `/orders/admin/items/${itemId}/status`,
      {
        itemStatus,
      }
    );

    return res.data;
  },

  /**
   * Admin order-এর অন্য তথ্য update করার জন্য।
   */
  updateOrder: async (orderId, data) => {
    if (!orderId) {
      throw new Error("Order ID is required");
    }

    const res = await api.patch(
      `/orders/${orderId}/admin-update`,
      data
    );

    return res.data;
  },
};