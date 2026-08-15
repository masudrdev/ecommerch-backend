"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  getLoggedInUserRole,
  orderDetailsService,
} from "@/services/orderDetails.service";

/* ======================================================
   STATUS FLOWS
====================================================== */

const vendorNextStatusMap = {
  PENDING: "CONFIRMED",
  CONFIRMED: "PROCESSING",
  PROCESSING: "SHIPPED",
};

const adminNextItemStatusMap = {
  PENDING: "CONFIRMED",
  CONFIRMED: "PROCESSING",
  PROCESSING: "SHIPPED",
  SHIPPED: "DELIVERED",
  RESHIPPED: "DELIVERED",
  DELIVERED: "COMPLETED",
};

const vendorReturnNextStatusMap = {
  REQUESTED: [
    "APPROVED",
    "REJECTED",
  ],
  APPROVED: ["IN_TRANSIT"],
  IN_TRANSIT: ["RECEIVED"],
  RECEIVED: ["RESHIPPED"],
};

const finalVendorItemStatuses = [
  "SHIPPED",
  "RESHIPPED",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
];

const finalAdminItemStatuses = [
  "COMPLETED",
  "CANCELLED",
];

const activeReturnStatuses = [
  "REQUESTED",
  "APPROVED",
  "IN_TRANSIT",
  "RECEIVED",
  "RESHIPPED",
];

/* ======================================================
   HELPERS
====================================================== */

function formatMoney(value) {
  return new Intl.NumberFormat(
    "en-BD",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  ).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleString(
    "en-BD"
  );
}

function getStatusStyle(status) {
  const value = String(
    status || ""
  ).toUpperCase();

  if (
    [
      "DELIVERED",
      "COMPLETED",
      "PAID",
      "APPROVED",
      "RESOLVED",
    ].includes(value)
  ) {
    return "bg-green-500/10 text-green-400";
  }

  if (
    [
      "CANCELLED",
      "REJECTED",
      "FAILED",
      "RETURNED",
      "REFUNDED",
    ].includes(value)
  ) {
    return "bg-red-500/10 text-red-400";
  }

  if (
    [
      "SHIPPED",
      "RESHIPPED",
      "PROCESSING",
      "PARTIALLY_PAID",
      "IN_TRANSIT",
      "RECEIVED",
    ].includes(value)
  ) {
    return "bg-blue-500/10 text-blue-400";
  }

  if (
    [
      "CONFIRMED",
      "REQUESTED",
    ].includes(value)
  ) {
    return "bg-purple-500/10 text-purple-400";
  }

  return "bg-orange-500/10 text-orange-400";
}

function StatusBadge({ status }) {
  const normalizedStatus = String(
    status || "N/A"
  ).toUpperCase();

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(
        normalizedStatus
      )}`}
    >
      {normalizedStatus.replaceAll(
        "_",
        " "
      )}
    </span>
  );
}

function InfoCard({
  label,
  children,
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#1E293B] p-4">
      <p className="text-sm text-gray-400">
        {label}
      </p>

      <div className="mt-2">
        {children}
      </div>
    </div>
  );
}

/* ======================================================
   RETURN WINDOW
====================================================== */

function getReturnDeadline(
  deliveredAt
) {
  if (!deliveredAt) return null;

  const deliveredTime =
    new Date(deliveredAt).getTime();

  if (
    Number.isNaN(deliveredTime)
  ) {
    return null;
  }

  return new Date(
    deliveredTime +
      3 * 24 * 60 * 60 * 1000
  );
}

function getReturnWindowInfo(
  deliveredAt
) {
  const deadline =
    getReturnDeadline(deliveredAt);

  if (!deadline) {
    return {
      deadline: null,
      expired: true,
      remainingText:
        "Return deadline unavailable",
    };
  }

  const remainingMilliseconds =
    deadline.getTime() - Date.now();

  if (
    remainingMilliseconds <= 0
  ) {
    return {
      deadline,
      expired: true,
      remainingText:
        "Return window expired",
    };
  }

  const totalHours = Math.ceil(
    remainingMilliseconds /
      (60 * 60 * 1000)
  );

  const days = Math.floor(
    totalHours / 24
  );

  const hours =
    totalHours % 24;

  const remainingText =
    days > 0
      ? `${days} day${
          days !== 1 ? "s" : ""
        } ${hours} hour${
          hours !== 1 ? "s" : ""
        } remaining`
      : `${hours} hour${
          hours !== 1 ? "s" : ""
        } remaining`;

  return {
    deadline,
    expired: false,
    remainingText,
  };
}

/* ======================================================
   PAGE
====================================================== */

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const orderId = Array.isArray(
    params?.id
  )
    ? params.id[0]
    : params?.id;

  const [role, setRole] =
    useState(null);

  const [
    roleLoading,
    setRoleLoading,
  ] = useState(true);

  const [order, setOrder] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [
    pageError,
    setPageError,
  ] = useState("");

  const [
    selectedItemStatus,
    setSelectedItemStatus,
  ] = useState({});

  const [
    updatingItemId,
    setUpdatingItemId,
  ] = useState(null);

  const [
    cancellingCustomerItemId,
    setCancellingCustomerItemId,
  ] = useState(null);

  const [
    cancelModalItemId,
    setCancelModalItemId,
  ] = useState(null);

  const [
    cancellationReason,
    setCancellationReason,
  ] = useState("");

  const [
    cancellationError,
    setCancellationError,
  ] = useState("");

  const [
    selectedReturnStatus,
    setSelectedReturnStatus,
  ] = useState({});

  const [
    updatingReturnItemId,
    setUpdatingReturnItemId,
  ] = useState(null);

  const [
    returnFormItemId,
    setReturnFormItemId,
  ] = useState(null);

  const [
    returnReasons,
    setReturnReasons,
  ] = useState({});

  const [
    requestingReturnItemId,
    setRequestingReturnItemId,
  ] = useState(null);

  const [note, setNote] =
    useState("");

  const [
    savingNote,
    setSavingNote,
  ] = useState(false);

  const isVendor =
    role === "VENDOR";

  const isAdmin =
    role === "ADMIN" ||
    role === "SUPER_ADMIN";

  const isSuperAdmin =
    role === "SUPER_ADMIN";

  const isCustomer =
    role === "CUSTOMER";

  /* ======================================================
     ROLE
  ====================================================== */

  useEffect(() => {
    const loggedInRole =
      getLoggedInUserRole();

    setRole(loggedInRole);
    setRoleLoading(false);
  }, []);

  /* ======================================================
     FETCH ORDER
  ====================================================== */

  const fetchOrder =
    useCallback(async () => {
      if (!orderId || !role) {
        return;
      }

      try {
        setLoading(true);
        setPageError("");

        const response =
          await orderDetailsService.getOrderDetails(
            orderId,
            role
          );

        const orderData =
          response?.order ||
          response?.data?.order ||
          response?.data ||
          null;

        if (!orderData) {
          throw new Error(
            "Order data was not found"
          );
        }

        setOrder(orderData);
      } catch (error) {
        console.error(
          `${role} order details error:`,
          error?.response?.data ||
            error
        );

        const statusCode =
          error?.response?.status;

        if (statusCode === 403) {
          setPageError(
            "You do not have permission to view this order."
          );
        } else if (
          statusCode === 404
        ) {
          setPageError(
            "Order not found."
          );
        } else {
          setPageError(
            error?.response?.data
              ?.message ||
              error?.message ||
              "Failed to load order details."
          );
        }

        setOrder(null);
      } finally {
        setLoading(false);
      }
    }, [orderId, role]);

  useEffect(() => {
    if (
      !roleLoading &&
      orderId &&
      role
    ) {
      fetchOrder();
    }
  }, [
    fetchOrder,
    orderId,
    role,
    roleLoading,
  ]);

  /* ======================================================
     DATA
  ====================================================== */

  const visibleItems =
    useMemo(() => {
      if (
        Array.isArray(
          order?.items
        )
      ) {
        return order.items;
      }

      if (
        Array.isArray(
          order?.orderItems
        )
      ) {
        return order.orderItems;
      }

      return [];
    }, [order]);

  const visibleTimeline =
    useMemo(() => {
      const timeline =
        order?.timeline ||
        order?.timelines ||
        [];

      if (
        !Array.isArray(timeline)
      ) {
        return [];
      }

      if (isCustomer) {
        return timeline.filter(
          (timelineItem) =>
            String(
              timelineItem?.type ||
                ""
            ).toUpperCase() !==
            "NOTE"
        );
      }

      return timeline;
    }, [order, isCustomer]);

  const displayedOrderStatus =
    String(
      order?.orderStatus ||
        order?.status ||
        order?.vendorStatus ||
        "PENDING"
    ).toUpperCase();


  const financialSummary =
    useMemo(() => {
      return visibleItems.reduce(
        (result, item) => {
          const itemStatus = String(
            item?.itemStatus ||
              item?.status ||
              ""
          ).toUpperCase();

          const financialEligible =
            item?.financialEligible !== false &&
            itemStatus !== "CANCELLED";

          if (!financialEligible) {
            return result;
          }

          const price = Number(
            item?.price || 0
          );

          const quantity = Number(
            item?.quantity || 0
          );

          const subtotal = Number(
            item?.subtotal ??
              price * quantity
          );

          const commission = Number(
            item?.platformEarning ??
              item?.commissionAmount ??
              0
          );

          const vendorEarning = Number(
            item?.vendorEarning ??
              Math.max(
                subtotal - commission,
                0
              )
          );

          result.productTotal +=
            subtotal;

          result.totalCommission +=
            commission;

          result.totalVendorEarning +=
            vendorEarning;

          return result;
        },
        {
          productTotal: 0,
          totalCommission: 0,
          totalVendorEarning: 0,
        }
      );
    }, [visibleItems]);

  const deliveryFee = Number(
    order?.deliveryFee ??
      order?.shippingCharge ??
      order?.shippingFee ??
      0
  );

  const grandTotal = Number(
    order?.grandTotal ??
      order?.totalAmount ??
      financialSummary.productTotal +
        deliveryFee
  );

  /* ======================================================
     ITEM STATUS UPDATE
  ====================================================== */

  const updateItemStatus = async (
    itemId,
    itemStatus,
    reason = ""
  ) => {
    try {
      setUpdatingItemId(itemId);

      if (isVendor) {
        await orderDetailsService.updateVendorItemStatus(
          itemId,
          itemStatus
        );
      } else {
        await orderDetailsService.updateAdminItemStatus(
          itemId,
          itemStatus,
          reason
        );
      }

      setSelectedItemStatus(
        (previous) => ({
          ...previous,
          [itemId]: "",
        })
      );

      setCancelModalItemId(null);
      setCancellationReason("");
      setCancellationError("");

      await fetchOrder();

      alert(
        itemStatus === "CANCELLED"
          ? "Item cancelled successfully."
          : "Item status updated successfully."
      );
    } catch (error) {
      console.error(
        "Item status update error:",
        error?.response?.data || error
      );

      const message =
        error?.response?.data?.message ||
        `Item status update failed (${
          error?.response?.status || "error"
        }).`;

      if (itemStatus === "CANCELLED") {
        setCancellationError(message);
      } else {
        alert(message);
      }
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleItemStatusUpdate =
    async (itemId) => {
      if (!isVendor && !isAdmin) {
        alert(
          "You are not allowed to update item status."
        );
        return;
      }

      const itemStatus =
        selectedItemStatus[itemId];

      if (!itemId || !itemStatus) {
        alert(
          "Please select a status first."
        );
        return;
      }

      if (
        isAdmin &&
        itemStatus === "CANCELLED"
      ) {
        setCancelModalItemId(itemId);
        setCancellationReason("");
        setCancellationError("");
        return;
      }

      await updateItemStatus(
        itemId,
        itemStatus
      );
    };

  const handleConfirmCancellation =
    async () => {
      const reason = String(
        cancellationReason || ""
      ).trim();

      if (reason.length < 5) {
        setCancellationError(
          "Please write a cancellation reason of at least 5 characters."
        );
        return;
      }

      if (!cancelModalItemId) {
        setCancellationError(
          "Order item was not found. Close the popup and try again."
        );
        return;
      }

      setCancellationError("");

      await updateItemStatus(
        cancelModalItemId,
        "CANCELLED",
        reason
      );
    };

  const handleCustomerPendingItemCancel =
    async (item) => {
      if (!isCustomer) {
        alert(
          "Only customers can cancel their own pending items."
        );
        return;
      }

      const itemId = item?.id;

      const itemStatus = String(
        item?.itemStatus ||
          item?.status ||
          ""
      ).toUpperCase();

      if (!itemId) {
        alert(
          "Order item was not found."
        );
        return;
      }

      if (itemStatus !== "PENDING") {
        alert(
          "Only pending items can be cancelled."
        );
        return;
      }

      const reason = window.prompt(
        "Write the cancellation reason (minimum 5 characters):"
      );

      if (reason === null) {
        return;
      }

      const cleanReason = String(
        reason || ""
      ).trim();

      if (cleanReason.length < 5) {
        alert(
          "Cancellation reason must be at least 5 characters."
        );
        return;
      }

      const confirmed = window.confirm(
        "Are you sure you want to cancel this pending item?"
      );

      if (!confirmed) {
        return;
      }

      try {
        setCancellingCustomerItemId(
          itemId
        );

        await orderDetailsService.cancelCustomerPendingItem(
          itemId,
          cleanReason
        );

        await fetchOrder();

        alert(
          "Pending item cancelled successfully."
        );
      } catch (error) {
        console.error(
          "Customer item cancellation error:",
          error?.response?.data ||
            error
        );

        alert(
          error?.response?.data
            ?.message ||
            "Item cancellation failed."
        );
      } finally {
        setCancellingCustomerItemId(
          null
        );
      }
    };

  /* ======================================================
     CUSTOMER RETURN REQUEST
  ====================================================== */

  const handleCustomerReturnRequest =
    async (item) => {
      if (!isCustomer) {
        alert(
          "Only customers can submit a return request."
        );
        return;
      }

      const itemId = item?.id;

      const itemStatus =
        String(
          item?.itemStatus ||
            item?.status ||
            ""
        ).toUpperCase();

      const returnStatus =
        String(
          item?.returnStatus ||
            "NONE"
        ).toUpperCase();

      if (
        itemStatus !==
        "DELIVERED"
      ) {
        alert(
          "Only delivered items can be returned."
        );
        return;
      }

      if (
        ![
          "NONE",
          "RESOLVED",
        ].includes(returnStatus)
      ) {
        alert(
          "A return request already exists for this item."
        );
        return;
      }

      const returnWindow =
        getReturnWindowInfo(
          item?.deliveredAt
        );

      if (
        returnWindow.expired
      ) {
        alert(
          "The 3-day return window has expired."
        );
        return;
      }

      const reason = String(
        returnReasons[itemId] || ""
      ).trim();

      if (reason.length < 5) {
        alert(
          "Please write a valid return reason."
        );
        return;
      }

      try {
        setRequestingReturnItemId(
          itemId
        );

        await orderDetailsService.requestCustomerReturn(
          itemId,
          reason
        );

        setReturnReasons(
          (previous) => ({
            ...previous,
            [itemId]: "",
          })
        );

        setReturnFormItemId(null);

        await fetchOrder();

        alert(
          "Return request submitted successfully."
        );
      } catch (error) {
        console.error(
          "Customer return request error:",
          error?.response?.data ||
            error
        );

        alert(
          error?.response?.data
            ?.message ||
            "Return request failed."
        );
      } finally {
        setRequestingReturnItemId(
          null
        );
      }
    };

  /* ======================================================
     ADMIN / VENDOR RETURN MANAGEMENT
  ====================================================== */

  const handleReturnStatusUpdate =
    async (itemId) => {
      if (
        !isVendor &&
        !isAdmin
      ) {
        alert(
          "You cannot update return status."
        );
        return;
      }

      const returnStatus =
        selectedReturnStatus[itemId];

      if (
        !itemId ||
        !returnStatus
      ) {
        alert(
          "Please select a return action."
        );
        return;
      }

      try {
        setUpdatingReturnItemId(
          itemId
        );

        if (isVendor) {
          await orderDetailsService.updateVendorReturnStatus(
            itemId,
            returnStatus
          );
        } else {
          await orderDetailsService.updateAdminReturnStatus(
            itemId,
            returnStatus
          );
        }

        setSelectedReturnStatus(
          (previous) => ({
            ...previous,
            [itemId]: "",
          })
        );

        await fetchOrder();

        alert(
          "Return status updated successfully."
        );
      } catch (error) {
        console.error(
          "Return status update error:",
          error?.response?.data ||
            error
        );

        alert(
          error?.response?.data
            ?.message ||
            "Return status update failed."
        );
      } finally {
        setUpdatingReturnItemId(
          null
        );
      }
    };

  /* ======================================================
     VENDOR NOTE
  ====================================================== */

  const handleAddVendorNote =
    async () => {
      if (!isVendor) return;

      const cleanNote =
        note.trim();

      if (!cleanNote) {
        alert(
          "Please write a note first."
        );
        return;
      }

      try {
        setSavingNote(true);

        await orderDetailsService.addVendorNote(
          order?.id || orderId,
          cleanNote
        );

        setNote("");

        await fetchOrder();

        alert(
          "Note added successfully."
        );
      } catch (error) {
        console.error(
          "Vendor note error:",
          error?.response?.data ||
            error
        );

        alert(
          error?.response?.data
            ?.message ||
            "Note save failed."
        );
      } finally {
        setSavingNote(false);
      }
    };

  /* ======================================================
     LOADING / ERRORS
  ====================================================== */

  if (
    roleLoading ||
    loading
  ) {
    return (
      <div className="rounded-xl bg-[#1E293B] p-6 text-gray-300">
        Loading order...
      </div>
    );
  }

  if (!role) {
    return (
      <div className="rounded-xl bg-[#1E293B] p-6 text-center">
        <h2 className="text-lg font-bold text-white">
          User role not found
        </h2>

        <p className="mt-2 text-sm text-gray-400">
          Please log out and log
          in again.
        </p>
      </div>
    );
  }

  if (
    pageError ||
    !order
  ) {
    return (
      <div className="rounded-xl bg-[#1E293B] p-6 text-center">
        <h2 className="text-lg font-bold text-white">
          Unable to open order
        </h2>

        <p className="mt-2 text-sm text-red-400">
          {pageError ||
            "Order not found."}
        </p>

        <button
          type="button"
          onClick={() =>
            router.back()
          }
          className="mt-4 rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Back
        </button>
      </div>
    );
  }

  const displayedTotal =
    isVendor
      ? financialSummary.totalVendorEarning
      : grandTotal;

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-white">
              Order #
              {order?.orderNumber ||
                order?.id}
            </h1>

            <StatusBadge
              status={
                displayedOrderStatus
              }
            />
          </div>

          <p className="mt-1 text-sm text-gray-400">
            {formatDate(
              order?.createdAt
            )}
          </p>

          <p className="mt-1 text-xs font-semibold text-orange-400">
            Viewing as: {role}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            router.back()
          }
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Back
        </button>
      </div>

      {/* SUMMARY */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InfoCard label="Order Status">
          <StatusBadge
            status={
              displayedOrderStatus
            }
          />
        </InfoCard>

        {isVendor && (
          <InfoCard label="Vendor Status">
            <StatusBadge
              status={
                order?.vendorStatus ||
                displayedOrderStatus
              }
            />
          </InfoCard>
        )}

        {(isVendor ||
          isAdmin) && (
          <InfoCard label="Product Total">
            <h3 className="text-2xl font-bold text-white">
              ৳
              {formatMoney(
                financialSummary.productTotal
              )}
            </h3>
          </InfoCard>
        )}

        {(isVendor ||
          isAdmin) && (
          <InfoCard label="Commission">
            <h3 className="text-2xl font-bold text-orange-400">
              ৳
              {formatMoney(
                financialSummary.totalCommission
              )}
            </h3>
          </InfoCard>
        )}

        {isVendor && (
          <InfoCard label="Your Earning">
            <h3 className="text-2xl font-bold text-green-400">
              ৳
              {formatMoney(
                financialSummary.totalVendorEarning
              )}
            </h3>
          </InfoCard>
        )}

        {isAdmin && (
          <InfoCard label="Vendor Earning">
            <h3 className="text-2xl font-bold text-purple-400">
              ৳
              {formatMoney(
                financialSummary.totalVendorEarning
              )}
            </h3>
          </InfoCard>
        )}

        {isAdmin && (
          <InfoCard label="Delivery Fee">
            <h3 className="text-2xl font-bold text-white">
              ৳
              {formatMoney(
                deliveryFee
              )}
            </h3>
          </InfoCard>
        )}

        {!isVendor && (
          <InfoCard label="Grand Total">
            <h3 className="text-2xl font-bold text-white">
              ৳
              {formatMoney(
                grandTotal
              )}
            </h3>
          </InfoCard>
        )}

        {isCustomer && (
          <InfoCard label="Order Total">
            <h3 className="text-2xl font-bold text-white">
              ৳
              {formatMoney(
                displayedTotal
              )}
            </h3>
          </InfoCard>
        )}

        <InfoCard label="Payment">
          <p className="font-semibold text-white">
            {order?.paymentMethod ||
              "COD"}
          </p>

          <div className="mt-2">
            <StatusBadge
              status={
                order?.paymentStatus ||
                "UNPAID"
              }
            />
          </div>
        </InfoCard>

        <InfoCard label="Account Role">
          <p className="font-bold text-white">
            {isSuperAdmin
              ? "Super Admin"
              : isAdmin
              ? "Admin"
              : isVendor
              ? "Vendor"
              : isCustomer
              ? "Customer"
              : role}
          </p>
        </InfoCard>
      </div>

      {/* PRODUCTS */}
      <div className="rounded-xl border border-white/10 bg-[#1E293B] p-5">
        <h2 className="mb-4 text-lg font-bold text-white">
          Products
        </h2>

        {visibleItems.length ===
        0 ? (
          <p className="text-sm text-gray-500">
            No products found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1750px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-gray-400">
                  <th className="pb-3">
                    Image
                  </th>

                  <th className="pb-3">
                    Product
                  </th>

                  <th className="pb-3">
                    Vendor
                  </th>

                  <th className="pb-3">
                    Size
                  </th>

                  <th className="pb-3">
                    Color
                  </th>

                  <th className="pb-3">
                    Qty
                  </th>

                  <th className="pb-3">
                    Price
                  </th>

                  <th className="pb-3">
                    Subtotal
                  </th>

                  {(isVendor ||
                    isAdmin) && (
                    <th className="pb-3">
                      Commission
                    </th>
                  )}

                  {isVendor && (
                    <th className="pb-3">
                      Your Earning
                    </th>
                  )}

                  {isAdmin && (
                    <th className="pb-3">
                      Vendor Earning
                    </th>
                  )}

                  <th className="pb-3">
                    Item Status
                  </th>

                  <th className="pb-3">
                    Return Status
                  </th>

                  {(isVendor ||
                    isAdmin) && (
                    <th className="pb-3">
                      Update Item
                    </th>
                  )}

                  {(isVendor ||
                    isAdmin) && (
                    <th className="pb-3">
                      Return Management
                    </th>
                  )}

                  {isCustomer && (
                    <th className="pb-3">
                      Return Action
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {visibleItems.map(
                  (item, index) => {
                    const itemId =
                      item?.id;

                    const itemStatus =
                      String(
                        item?.itemStatus ||
                          item?.status ||
                          "PENDING"
                      ).toUpperCase();

                    const returnStatus =
                      String(
                        item?.returnStatus ||
                          "NONE"
                      ).toUpperCase();

                    const returnInProgress =
                      activeReturnStatuses.includes(
                        returnStatus
                      );

                    const vendorLocked =
                      finalVendorItemStatuses.includes(
                        itemStatus
                      );

                    const adminLocked =
                      finalAdminItemStatuses.includes(
                        itemStatus
                      );

                    /*
                     * Return active থাকলে normal update lock।
                     * তবে Admin-এর জন্য:
                     * RESHIPPED → DELIVERED allow থাকবে।
                     */
                    const adminCanDeliverReshipped =
                      isAdmin &&
                      itemStatus ===
                        "RESHIPPED" &&
                      returnStatus ===
                        "RESHIPPED";

                    const returnBlocksNormalUpdate =
                      returnInProgress &&
                      !adminCanDeliverReshipped;

                    const itemLocked =
                      returnBlocksNormalUpdate ||
                      (isVendor
                        ? vendorLocked
                        : isAdmin
                        ? adminLocked
                        : true);

                    const nextStatus =
                      isVendor
                        ? vendorNextStatusMap[
                            itemStatus
                          ]
                        : isAdmin
                        ? adminNextItemStatusMap[
                            itemStatus
                          ]
                        : null;

                    const selectedStatus =
                      selectedItemStatus[
                        itemId
                      ] || "";

                    const vendorReturnOptions =
                      isVendor
                        ? vendorReturnNextStatusMap[
                            returnStatus
                          ] || []
                        : [];

                    const adminReturnOptions =
                      isAdmin &&
                      returnStatus ===
                        "REQUESTED"
                        ? [
                            "APPROVED",
                            "REJECTED",
                          ]
                        : [];

                    const returnManagementOptions =
                      isVendor
                        ? vendorReturnOptions
                        : isAdmin
                        ? adminReturnOptions
                        : [];

                    const canManageReturn =
                      (isVendor ||
                        isAdmin) &&
                      returnManagementOptions.length >
                        0;

                    const selectedManagedReturnStatus =
                      selectedReturnStatus[
                        itemId
                      ] || "";

                    const image =
                      item?.product
                        ?.images?.[0]
                        ?.url ||
                      item?.product
                        ?.images?.[0] ||
                      item?.image ||
                      "/placeholder.png";

                    const productName =
                      item?.product
                        ?.name ||
                      item?.productName ||
                      "N/A";

                    const productId =
                      item?.product
                        ?.id ||
                      item?.productId;

                    const returnWindow =
                      getReturnWindowInfo(
                        item?.deliveredAt
                      );

                    const returnRequestAllowed =
                      isCustomer &&
                      itemStatus ===
                        "DELIVERED" &&
                      [
                        "NONE",
                        "RESOLVED",
                      ].includes(
                        returnStatus
                      ) &&
                      Boolean(
                        item?.deliveredAt
                      ) &&
                      !returnWindow.expired;

                    const returnFormOpen =
                      returnFormItemId ===
                      itemId;

                    const itemSubtotal =
                      Number(
                        item?.subtotal ??
                          Number(
                            item?.price ||
                              0
                          ) *
                            Number(
                              item?.quantity ||
                                0
                            )
                      );

                    const itemCommission =
                      Number(
                        item?.platformEarning ??
                          item?.commissionAmount ??
                          0
                      );

                    const itemVendorEarning =
                      Number(
                        item?.vendorEarning ??
                          Math.max(
                            itemSubtotal -
                              itemCommission,
                            0
                          )
                      );

                    return (
                      <tr
                        key={
                          itemId ||
                          `${productId}-${index}`
                        }
                        className="border-b border-slate-800 align-top"
                      >
                        <td className="py-4">
                          <div className="relative h-14 w-14 overflow-hidden rounded-lg bg-slate-800">
                            <Image
                              src={image}
                              alt={
                                productName
                              }
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          </div>
                        </td>

                        <td className="py-4">
                          {productId &&
                          (isAdmin ||
                            isVendor) ? (
                            <Link
                              href={`/dashboard/products/${productId}`}
                              className="font-semibold text-blue-500 hover:text-orange-400"
                            >
                              {
                                productName
                              }
                            </Link>
                          ) : (
                            <span className="font-semibold text-white">
                              {
                                productName
                              }
                            </span>
                          )}
                        </td>

                        <td className="py-4 text-gray-300">
                          {item?.vendor
                            ?.shopName ||
                            item?.vendor
                              ?.name ||
                            item?.product
                              ?.vendor
                              ?.shopName ||
                            item?.product
                              ?.vendor
                              ?.name ||
                            "-"}
                        </td>

                        <td className="py-4 text-gray-300">
                          {item?.size ||
                            "-"}
                        </td>

                        <td className="py-4 text-gray-300">
                          {item?.color ||
                            "-"}
                        </td>

                        <td className="py-4 text-gray-300">
                          {item?.quantity ||
                            0}
                        </td>

                        <td className="py-4 text-gray-300">
                          ৳
                          {formatMoney(
                            item?.price
                          )}
                        </td>

                        <td className="py-4 font-semibold text-white">
                          ৳
                          {formatMoney(
                            itemSubtotal
                          )}
                        </td>

                        {(isVendor ||
                          isAdmin) && (
                          <td className="py-4 font-semibold text-orange-400">
                            ৳
                            {formatMoney(
                              itemCommission
                            )}
                          </td>
                        )}

                        {isVendor && (
                          <td className="py-4 font-semibold text-green-400">
                            ৳
                            {formatMoney(
                              itemVendorEarning
                            )}
                          </td>
                        )}

                        {isAdmin && (
                          <td className="py-4 font-semibold text-purple-400">
                            ৳
                            {formatMoney(
                              itemVendorEarning
                            )}
                          </td>
                        )}

                        {/* ITEM STATUS */}
                        <td className="py-4">
                          <StatusBadge
                            status={
                              itemStatus
                            }
                          />

                          {itemStatus ===
                            "DELIVERED" &&
                            item?.deliveredAt && (
                              <p className="mt-2 max-w-[190px] text-xs text-gray-500">
                                Delivered:{" "}
                                {formatDate(
                                  item.deliveredAt
                                )}
                              </p>
                            )}

                          {itemStatus ===
                            "RESHIPPED" && (
                            <p className="mt-2 max-w-[190px] text-xs text-blue-400">
                              Replacement shipped.
                              Waiting for Admin
                              delivery confirmation.
                            </p>
                          )}

                          {itemStatus ===
                            "COMPLETED" &&
                            item?.completedAt && (
                              <p className="mt-2 max-w-[190px] text-xs text-gray-500">
                                Completed:{" "}
                                {formatDate(
                                  item.completedAt
                                )}
                              </p>
                            )}
                        </td>

                        {/* RETURN STATUS */}
                        <td className="py-4">
                          <StatusBadge
                            status={
                              returnStatus
                            }
                          />

                          {item
                            ?.returnRequestedAt && (
                            <p className="mt-2 max-w-[190px] text-xs text-gray-500">
                              Requested:{" "}
                              {formatDate(
                                item.returnRequestedAt
                              )}
                            </p>
                          )}

                          {item
                            ?.returnResolvedAt && (
                            <p className="mt-2 max-w-[190px] text-xs text-gray-500">
                              Resolved:{" "}
                              {formatDate(
                                item.returnResolvedAt
                              )}
                            </p>
                          )}
                        </td>

                        {/* NORMAL ITEM UPDATE */}
                        {(isVendor ||
                          isAdmin) && (
                          <td className="py-4">
                            {!itemLocked &&
                            nextStatus ? (
                              <div className="flex min-w-[220px] items-center gap-2">
                                <select
                                  value={
                                    selectedStatus
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    setSelectedItemStatus(
                                      (
                                        previous
                                      ) => ({
                                        ...previous,
                                        [itemId]:
                                          event
                                            .target
                                            .value,
                                      })
                                    )
                                  }
                                  className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-semibold text-white"
                                >
                                  <option value="">
                                    Select
                                  </option>

                                  <option
                                    value={
                                      nextStatus
                                    }
                                  >
                                    {
                                      nextStatus
                                    }
                                  </option>

                                  {isAdmin &&
                                    itemStatus !==
                                      "RESHIPPED" && (
                                      <option value="CANCELLED">
                                        CANCELLED
                                      </option>
                                    )}
                                </select>

                                <button
                                  type="button"
                                  disabled={
                                    updatingItemId ===
                                      itemId ||
                                    !selectedStatus
                                  }
                                  onClick={() =>
                                    handleItemStatusUpdate(
                                      itemId
                                    )
                                  }
                                  className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                                >
                                  {updatingItemId ===
                                  itemId
                                    ? "Updating..."
                                    : "Update"}
                                </button>
                              </div>
                            ) : returnBlocksNormalUpdate ? (
                              <div className="max-w-[220px]">
                                <button
                                  type="button"
                                  disabled
                                  className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-gray-400"
                                >
                                  Return Active
                                </button>

                                <p className="mt-2 text-xs text-gray-500">
                                  Normal item update
                                  is paused during
                                  return processing.
                                </p>
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled
                                className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-gray-400"
                              >
                                Locked
                              </button>
                            )}
                          </td>
                        )}

                        {/* ADMIN / VENDOR RETURN MANAGEMENT */}
                        {(isVendor ||
                          isAdmin) && (
                          <td className="py-4">
                            {canManageReturn ? (
                              <div className="min-w-[230px] space-y-2">
                                <select
                                  value={
                                    selectedManagedReturnStatus
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    setSelectedReturnStatus(
                                      (
                                        previous
                                      ) => ({
                                        ...previous,
                                        [itemId]:
                                          event
                                            .target
                                            .value,
                                      })
                                    )
                                  }
                                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-semibold text-white"
                                >
                                  <option value="">
                                    Select return
                                    action
                                  </option>

                                  {returnManagementOptions.map(
                                    (
                                      statusValue
                                    ) => (
                                      <option
                                        key={
                                          statusValue
                                        }
                                        value={
                                          statusValue
                                        }
                                      >
                                        {statusValue.replaceAll(
                                          "_",
                                          " "
                                        )}
                                      </option>
                                    )
                                  )}
                                </select>

                                <button
                                  type="button"
                                  disabled={
                                    updatingReturnItemId ===
                                      itemId ||
                                    !selectedManagedReturnStatus
                                  }
                                  onClick={() =>
                                    handleReturnStatusUpdate(
                                      itemId
                                    )
                                  }
                                  className="rounded-lg bg-purple-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                                >
                                  {updatingReturnItemId ===
                                  itemId
                                    ? "Updating..."
                                    : selectedManagedReturnStatus ===
                                      "APPROVED"
                                    ? "Approve Return"
                                    : selectedManagedReturnStatus ===
                                      "REJECTED"
                                    ? "Reject Return"
                                    : selectedManagedReturnStatus ===
                                      "IN_TRANSIT"
                                    ? "Mark In Transit"
                                    : selectedManagedReturnStatus ===
                                      "RECEIVED"
                                    ? "Mark Received"
                                    : selectedManagedReturnStatus ===
                                      "RESHIPPED"
                                    ? "Mark Reshipped"
                                    : "Update Return"}
                                </button>
                              </div>
                            ) : returnStatus ===
                              "APPROVED" &&
                              isAdmin ? (
                              <div>
                                <StatusBadge
                                  status="APPROVED"
                                />

                                <p className="mt-2 max-w-[220px] text-xs text-gray-400">
                                  Vendor will continue
                                  the return process.
                                </p>
                              </div>
                            ) : returnStatus ===
                              "REJECTED" ? (
                              <div>
                                <StatusBadge
                                  status="REJECTED"
                                />

                                <p className="mt-2 max-w-[220px] text-xs text-gray-500">
                                  Return request
                                  rejected.
                                </p>
                              </div>
                            ) : returnStatus ===
                              "IN_TRANSIT" ? (
                              <div>
                                <StatusBadge
                                  status="IN_TRANSIT"
                                />

                                <p className="mt-2 max-w-[220px] text-xs text-gray-400">
                                  Product is returning
                                  to vendor.
                                </p>
                              </div>
                            ) : returnStatus ===
                              "RECEIVED" ? (
                              <div>
                                <StatusBadge
                                  status="RECEIVED"
                                />

                                <p className="mt-2 max-w-[220px] text-xs text-gray-400">
                                  Vendor received the
                                  returned product.
                                </p>
                              </div>
                            ) : returnStatus ===
                              "RESHIPPED" ? (
                              <div>
                                <StatusBadge
                                  status="RESHIPPED"
                                />

                                <p className="mt-2 max-w-[220px] text-xs text-gray-400">
                                  Replacement shipped.
                                  Admin must confirm
                                  delivery.
                                </p>
                              </div>
                            ) : returnStatus ===
                              "RESOLVED" ? (
                              <div>
                                <StatusBadge
                                  status="RESOLVED"
                                />

                                <p className="mt-2 max-w-[220px] text-xs text-green-400">
                                  Replacement delivered.
                                </p>
                              </div>
                            ) : (
                              <p className="max-w-[220px] text-xs text-gray-500">
                                No active return
                                request.
                              </p>
                            )}
                          </td>
                        )}

                        {/* CUSTOMER RETURN ACTION */}
                        {isCustomer && (
                          <td className="py-4">
                            {itemStatus ===
                            "PENDING" ? (
                              <div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCustomerPendingItemCancel(
                                      item
                                    )
                                  }
                                  disabled={
                                    cancellingCustomerItemId ===
                                    itemId
                                  }
                                  className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {cancellingCustomerItemId ===
                                  itemId
                                    ? "Cancelling..."
                                    : "Cancel Item"}
                                </button>

                                <p className="mt-2 max-w-[220px] text-xs text-gray-500">
                                  Pending items can be cancelled before vendor confirmation.
                                </p>
                              </div>
                            ) : itemStatus ===
                            "CANCELLED" ? (
                              <div>
                                <StatusBadge
                                  status="CANCELLED"
                                />

                                <p className="mt-2 max-w-[220px] text-xs text-red-400">
                                  This item has been cancelled.
                                </p>
                              </div>
                            ) : itemStatus ===
                            "COMPLETED" ? (
                              <div>
                                <button
                                  type="button"
                                  disabled
                                  className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-gray-400"
                                >
                                  Return Locked
                                </button>

                                <p className="mt-2 max-w-[220px] text-xs text-gray-500">
                                  Completed items
                                  cannot be returned.
                                </p>
                              </div>
                            ) : returnStatus ===
                              "REQUESTED" ? (
                              <div>
                                <StatusBadge
                                  status="REQUESTED"
                                />

                                <p className="mt-2 max-w-[220px] text-xs text-gray-400">
                                  Waiting for approval.
                                </p>
                              </div>
                            ) : returnStatus ===
                              "APPROVED" ? (
                              <div>
                                <StatusBadge
                                  status="APPROVED"
                                />

                                <p className="mt-2 max-w-[220px] text-xs text-green-400">
                                  Return approved.
                                  Send the product back.
                                </p>
                              </div>
                            ) : returnStatus ===
                              "IN_TRANSIT" ? (
                              <div>
                                <StatusBadge
                                  status="IN_TRANSIT"
                                />

                                <p className="mt-2 max-w-[220px] text-xs text-blue-400">
                                  Product is returning
                                  to vendor.
                                </p>
                              </div>
                            ) : returnStatus ===
                              "RECEIVED" ? (
                              <div>
                                <StatusBadge
                                  status="RECEIVED"
                                />

                                <p className="mt-2 max-w-[220px] text-xs text-blue-400">
                                  Vendor received your
                                  product.
                                </p>
                              </div>
                            ) : returnStatus ===
                              "RESHIPPED" ||
                              itemStatus ===
                                "RESHIPPED" ? (
                              <div>
                                <StatusBadge
                                  status="RESHIPPED"
                                />

                                <p className="mt-2 max-w-[220px] text-xs text-blue-400">
                                  Your replacement is
                                  on the way.
                                </p>
                              </div>
                            ) : returnStatus ===
                              "REJECTED" ? (
                              <div>
                                <StatusBadge
                                  status="REJECTED"
                                />

                                <p className="mt-2 max-w-[220px] text-xs text-red-400">
                                  Your return request
                                  was rejected.
                                </p>
                              </div>
                            ) : returnRequestAllowed ? (
                              <div className="min-w-[250px]">
                                {!returnFormOpen ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setReturnFormItemId(
                                          itemId
                                        )
                                      }
                                      className="rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white"
                                    >
                                      Request Return
                                    </button>

                                    <p className="mt-2 text-xs text-green-400">
                                      {
                                        returnWindow.remainingText
                                      }
                                    </p>

                                    <p className="mt-1 text-xs text-gray-500">
                                      Deadline:{" "}
                                      {formatDate(
                                        returnWindow
                                          .deadline
                                      )}
                                    </p>
                                  </>
                                ) : (
                                  <div className="space-y-2">
                                    <textarea
                                      rows={3}
                                      value={
                                        returnReasons[
                                          itemId
                                        ] || ""
                                      }
                                      onChange={(
                                        event
                                      ) =>
                                        setReturnReasons(
                                          (
                                            previous
                                          ) => ({
                                            ...previous,
                                            [itemId]:
                                              event
                                                .target
                                                .value,
                                          })
                                        )
                                      }
                                      placeholder="Write return reason..."
                                      className="w-full rounded-lg border border-slate-600 bg-slate-800 p-2 text-xs text-white"
                                    />

                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        disabled={
                                          requestingReturnItemId ===
                                            itemId ||
                                          String(
                                            returnReasons[
                                              itemId
                                            ] || ""
                                          ).trim()
                                            .length <
                                            5
                                        }
                                        onClick={() =>
                                          handleCustomerReturnRequest(
                                            item
                                          )
                                        }
                                        className="rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                                      >
                                        {requestingReturnItemId ===
                                        itemId
                                          ? "Submitting..."
                                          : "Submit"}
                                      </button>

                                      <button
                                        type="button"
                                        disabled={
                                          requestingReturnItemId ===
                                          itemId
                                        }
                                        onClick={() => {
                                          setReturnFormItemId(
                                            null
                                          );

                                          setReturnReasons(
                                            (
                                              previous
                                            ) => ({
                                              ...previous,
                                              [itemId]:
                                                "",
                                            })
                                          );
                                        }}
                                        className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : itemStatus ===
                                "DELIVERED" &&
                              returnWindow.expired ? (
                              <div>
                                <button
                                  type="button"
                                  disabled
                                  className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-gray-400"
                                >
                                  Return Expired
                                </button>

                                <p className="mt-2 max-w-[220px] text-xs text-red-400">
                                  The 3-day return
                                  window has expired.
                                </p>
                              </div>
                            ) : returnStatus ===
                              "RESOLVED" ? (
                              <div>
                                <StatusBadge
                                  status="RESOLVED"
                                />

                                <p className="mt-2 max-w-[220px] text-xs text-green-400">
                                  Replacement delivered.
                                </p>
                              </div>
                            ) : (
                              <p className="max-w-[220px] text-xs text-gray-500">
                                Return is available
                                after delivery.
                              </p>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CUSTOMER INFORMATION */}
      {(isAdmin ||
        isVendor) && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-[#1E293B] p-5">
            <h2 className="mb-4 text-lg font-bold text-white">
              Customer Information
            </h2>

            <div className="space-y-2 text-sm text-gray-300">
              <p>
                Name:{" "}
                {order?.customer
                  ?.name ||
                  order?.user?.name ||
                  order?.customerName ||
                  "N/A"}
              </p>

              <p>
                Phone:{" "}
                {order?.customer
                  ?.phone ||
                  order?.user?.phone ||
                  order?.phone ||
                  order
                    ?.shippingAddress
                    ?.phone ||
                  "N/A"}
              </p>

              <p>
                Email:{" "}
                {order?.customer
                  ?.email ||
                  order?.user?.email ||
                  order?.email ||
                  "N/A"}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#1E293B] p-5">
            <h2 className="mb-4 text-lg font-bold text-white">
              Shipping Address
            </h2>

            <p className="text-sm leading-6 text-gray-300">
              {order
                ?.shippingAddress
                ?.addressLine ||
                order
                  ?.shippingAddress
                  ?.address ||
                order
                  ?.shippingAddress
                  ?.street ||
                order?.address ||
                "No shipping address available."}
            </p>

            <p className="mt-1 text-sm text-gray-300">
              {[
                order
                  ?.shippingAddress
                  ?.area,
                order
                  ?.shippingAddress
                  ?.city,
                order
                  ?.shippingAddress
                  ?.district ||
                  order?.district,
                order
                  ?.shippingAddress
                  ?.postalCode,
                order?.upazila,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* VENDOR NOTE */}
      {isVendor && (
        <div className="rounded-xl border border-white/10 bg-[#1E293B] p-5">
          <h2 className="mb-2 text-lg font-bold text-white">
            Add Internal Note
          </h2>

          <p className="mb-4 text-sm text-gray-400">
            Customer cannot see
            vendor internal notes.
          </p>

          <textarea
            value={note}
            onChange={(event) =>
              setNote(
                event.target.value
              )
            }
            rows={4}
            placeholder="Example: Packed, ready, courier waiting..."
            className="w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-sm text-white"
          />

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={
                handleAddVendorNote
              }
              disabled={
                savingNote ||
                !note.trim()
              }
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {savingNote
                ? "Saving..."
                : "Add Note"}
            </button>
          </div>

          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-bold text-white">
              Previous Notes
            </h3>

            {order?.notes?.length ? (
              order.notes.map(
                (noteItem) => (
                  <div
                    key={
                      noteItem?.id
                    }
                    className="rounded-lg border border-slate-700 bg-slate-800 p-3"
                  >
                    <p className="text-sm text-gray-200">
                      {
                        noteItem?.note
                      }
                    </p>

                    <p className="mt-2 text-xs text-gray-500">
                      {noteItem?.user
                        ?.name ||
                        "Vendor"}{" "}
                      •{" "}
                      {formatDate(
                        noteItem?.createdAt
                      )}
                    </p>
                  </div>
                )
              )
            ) : (
              <p className="text-sm text-gray-500">
                No notes added yet.
              </p>
            )}
          </div>
        </div>
      )}

      {/* TIMELINE */}
      <div className="rounded-xl border border-white/10 bg-[#1E293B] p-5">
        <h2 className="mb-4 text-lg font-bold text-white">
          Order Timeline
        </h2>

        {visibleTimeline.length ? (
          <div className="space-y-4">
            {visibleTimeline.map(
              (
                timelineItem,
                index
              ) => (
                <div
                  key={
                    timelineItem?.id ||
                    index
                  }
                  className="border-l-2 border-orange-500 pl-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-white">
                      {timelineItem?.title ||
                        timelineItem?.status ||
                        "Order Update"}
                    </h3>

                    {timelineItem?.type && (
                      <StatusBadge
                        status={
                          timelineItem.type
                        }
                      />
                    )}
                  </div>

                  {timelineItem?.details && (
                    <p className="mt-1 text-sm text-gray-300">
                      {
                        timelineItem.details
                      }
                    </p>
                  )}

                  <p className="mt-1 text-xs text-gray-500">
                    {timelineItem
                      ?.user?.name ||
                      "System"}{" "}
                    •{" "}
                    {formatDate(
                      timelineItem?.createdAt
                    )}
                  </p>
                </div>
              )
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No timeline available
            yet.
          </p>
        )}
      </div>

      {/* ADMIN CANCELLATION REASON MODAL */}
      {isAdmin && cancelModalItemId && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-order-item-title"
        >
          <div className="w-full max-w-lg rounded-2xl border border-red-500/30 bg-[#111827] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="cancel-order-item-title"
                  className="text-xl font-bold text-white"
                >
                  Cancel Order Item
                </h2>
                <p className="mt-2 text-sm text-gray-400">
                  Write the cancellation reason. It will be saved in the order timeline.
                </p>
              </div>

              <button
                type="button"
                disabled={updatingItemId === cancelModalItemId}
                onClick={() => {
                  setCancelModalItemId(null);
                  setCancellationReason("");
                  setCancellationError("");
                }}
                className="rounded-lg px-3 py-1 text-xl text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-50"
                aria-label="Close cancellation popup"
              >
                ×
              </button>
            </div>

            <label
              htmlFor="admin-cancellation-reason"
              className="mt-5 block text-sm font-semibold text-gray-200"
            >
              Cancellation reason
            </label>

            <textarea
              id="admin-cancellation-reason"
              autoFocus
              rows={5}
              maxLength={500}
              value={cancellationReason}
              onChange={(event) => {
                setCancellationReason(event.target.value);
                if (cancellationError) {
                  setCancellationError("");
                }
              }}
              placeholder="Example: Customer requested cancellation because the delivery address was incorrect."
              className="mt-2 w-full resize-none rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-red-400"
            />

            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500">
                Minimum 5 characters
              </p>
              <p className="text-xs text-gray-500">
                {cancellationReason.length}/500
              </p>
            </div>

            {cancellationError && (
              <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {cancellationError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={updatingItemId === cancelModalItemId}
                onClick={() => {
                  setCancelModalItemId(null);
                  setCancellationReason("");
                  setCancellationError("");
                }}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-slate-800 disabled:opacity-50"
              >
                Keep Order
              </button>

              <button
                type="button"
                disabled={
                  updatingItemId === cancelModalItemId ||
                  cancellationReason.trim().length < 5
                }
                onClick={handleConfirmCancellation}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {updatingItemId === cancelModalItemId
                  ? "Cancelling..."
                  : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
