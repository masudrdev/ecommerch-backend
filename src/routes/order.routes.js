import express from "express";
import { createOrder,
  getMyOrders,getOrderDetails,
  getAllOrdersForAdmin,
  updateOrderStatus,
  cancelMyOrder,
  updateOrderByAdmin,
  deleteOrderBySuperAdmin,
  createManualOrder,
  getVendorOrders,
  updateVendorOrderStatus,
  updateVendorOrderItemStatus,
  getVendorOrderDetails,
  addVendorOrderNote,
  updateOrderItemStatusByAdmin,
  requestOrderItemReturnByCustomer,
  cancelPendingOrderItemByCustomer,
  updateOrderItemReturnByVendor,
  updateOrderItemReturnByAdmin,

} from "../controllers/order.controller.js";
import { protect, allowRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post(
  "/checkout",
  protect,
  allowRoles("CUSTOMER", "ADMIN", "SUPER_ADMIN"),
  createOrder
);

router.get(
  "/my-orders",
  protect,
  getMyOrders
);

router.get(
  "/admin/all",
  protect,
  allowRoles("ADMIN", "SUPER_ADMIN"),
  getAllOrdersForAdmin
);

router.get(
  "/vendor",
  protect,
  allowRoles("VENDOR"),
  getVendorOrders
);
router.patch(
  "/admin/items/:itemId/return-status",
  protect,
  allowRoles(
    "ADMIN",
    "SUPER_ADMIN"
  ),
  updateOrderItemReturnByAdmin
);
router.patch(
  "/vendor/items/:itemId/return-status",
  protect,
  allowRoles("VENDOR"),
  updateOrderItemReturnByVendor
);
router.patch(
  "/customer/items/:itemId/cancel",
  protect,
  allowRoles("CUSTOMER"),
  cancelPendingOrderItemByCustomer
);

router.patch(
  "/customer/items/:itemId/return-request",
  protect,
  allowRoles("CUSTOMER"),
  requestOrderItemReturnByCustomer
);
router.post(
  "/vendor/orders/:orderId/notes",
  protect,
  allowRoles("VENDOR"),
  addVendorOrderNote
);
router.get(
  "/vendor/:orderId",
  protect,
  allowRoles("VENDOR"),
  getVendorOrderDetails
);

router.patch(
  "/admin/items/:itemId/status",
  protect,
  allowRoles("ADMIN", "SUPER_ADMIN"),
  updateOrderItemStatusByAdmin
);
router.patch(
  "/vendor/items/:itemId/status",
  protect,
  allowRoles("VENDOR"),
  updateVendorOrderItemStatus
);
router.patch(
  "/vendor/:id/status",
  protect,
  allowRoles("VENDOR"),
  updateVendorOrderStatus
);

router.get(
  "/:id",
  protect,
  getOrderDetails
);
router.patch(
  "/:id/status",
  protect,
  allowRoles("ADMIN", "SUPER_ADMIN"),
  updateOrderStatus
);
router.patch(
  "/:id/cancel",
  protect,
  allowRoles("CUSTOMER"),
  cancelMyOrder
);

router.patch(
  "/:id/admin-update",
  protect,
  allowRoles("ADMIN", "SUPER_ADMIN"),
  updateOrderByAdmin
);
router.post(
  "/manual",
  protect,
  allowRoles("ADMIN", "SUPER_ADMIN"),
  createManualOrder
);

router.delete(
  "/:id",
  protect,
  allowRoles("SUPER_ADMIN"),
  deleteOrderBySuperAdmin
);


export default router;