import api from "@/lib/axios";

export function getLoggedInUserRole() {
  if (typeof window === "undefined") return null;

  try {
    const storedUser =
      JSON.parse(localStorage.getItem("user") || "null") ||
      JSON.parse(localStorage.getItem("authUser") || "null");

    if (storedUser?.role) {
      return String(storedUser.role).toUpperCase();
    }

    const token =
      localStorage.getItem("accessToken") ||
      localStorage.getItem("token");

    if (!token) return null;

    const payloadPart = token.split(".")[1];

    if (!payloadPart) return null;

    const normalizedPayload = payloadPart
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const payload = JSON.parse(
      decodeURIComponent(
        window
          .atob(normalizedPayload)
          .split("")
          .map(
            (character) =>
              `%${character
                .charCodeAt(0)
                .toString(16)
                .padStart(2, "0")}`
          )
          .join("")
      )
    );

    return (
      String(
        payload?.role ||
          payload?.user?.role ||
          payload?.data?.role ||
          ""
      ).toUpperCase() || null
    );
  } catch (error) {
    console.error("Role read error:", error);
    return null;
  }
}

export const orderDetailsService = {
  getOrderDetails: async (orderId, role) => {
    if (!orderId) {
      throw new Error("Order ID is required");
    }

    if (String(role || "").toUpperCase() === "VENDOR") {
      const response = await api.get(
        `/orders/vendor/${orderId}`
      );

      return response.data;
    }

    const response = await api.get(`/orders/${orderId}`);

    return response.data;
  },

  updateVendorItemStatus: async (
    itemId,
    itemStatus
  ) => {
    if (!itemId || !itemStatus) {
      throw new Error(
        "Item ID and item status are required"
      );
    }

    const response = await api.patch(
      `/orders/vendor/items/${itemId}/status`,
      {
        itemStatus,
        status: itemStatus,
      }
    );

    return response.data;
  },

  updateAdminItemStatus: async (
    itemId,
    itemStatus,
    cancellationReason = ""
  ) => {
    if (!itemId || !itemStatus) {
      throw new Error(
        "Item ID and item status are required"
      );
    }

    const response = await api.patch(
      `/orders/admin/items/${itemId}/status`,
      {
        itemStatus,
        status: itemStatus,
        ...(String(itemStatus).toUpperCase() === "CANCELLED"
          ? {
              cancellationReason: String(
                cancellationReason || ""
              ).trim(),
              reason: String(
                cancellationReason || ""
              ).trim(),
            }
          : {}),
      }
    );

    return response.data;
  },

  updateAdminOrderStatus: async (
    orderId,
    status
  ) => {
    if (!orderId || !status) {
      throw new Error(
        "Order ID and status are required"
      );
    }

    const response = await api.patch(
      `/orders/${orderId}/status`,
      {
        status,
        orderStatus: status,
      }
    );

    return response.data;
  },
updateVendorReturnStatus: async (
  itemId,
  returnStatus
) => {
  if (!itemId) {
    throw new Error(
      "Order item ID is required"
    );
  }

  if (!returnStatus) {
    throw new Error(
      "Return status is required"
    );
  }

  const response = await api.patch(
    `/orders/vendor/items/${itemId}/return-status`,
    {
      returnStatus,
    }
  );

  return response.data;
},
  cancelCustomerPendingItem: async (
    itemId,
    reason
  ) => {
    if (!itemId) {
      throw new Error(
        "Order item ID is required"
      );
    }

    const cleanReason = String(
      reason || ""
    ).trim();

    if (cleanReason.length < 5) {
      throw new Error(
        "Cancellation reason must be at least 5 characters"
      );
    }

    const response = await api.patch(
      `/orders/customer/items/${itemId}/cancel`,
      {
        reason: cleanReason,
      }
    );

    return response.data;
  },

  requestCustomerReturn: async (
  itemId,
  reason
) => {
  if (!itemId) {
    throw new Error(
      "Order item ID is required"
    );
  }

  if (!String(reason || "").trim()) {
    throw new Error(
      "Return reason is required"
    );
  }

  const response = await api.patch(
    `/orders/customer/items/${itemId}/return-request`,
    {
      reason: String(
        reason
      ).trim(),
    }
  );

  return response.data;
},
  addVendorNote: async (orderId, note) => {
    if (!orderId || !String(note || "").trim()) {
      throw new Error(
        "Order ID and note are required"
      );
    }

    const response = await api.post(
      `/orders/vendor/orders/${orderId}/notes`,
      {
        note: String(note).trim(),
        noteType: "VENDOR_INTERNAL",
        visibleToCustomer: false,
      }
    );

    return response.data;
  },
};