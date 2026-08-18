import prisma from "../lib/prisma.js";
import createActivityLog from "../utils/createActivityLog.js";

const STAFF_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "SUPPORT_AGENT"]);
const SENSITIVE_FIELDS = new Set(["password", "currentPassword", "newPassword", "refreshToken", "token", "code", "otp"]);

const safeData = (value) => {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(safeData);
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !SENSITIVE_FIELDS.has(key))
    .map(([key, item]) => [key, safeData(item)]));
};

const resourceFor = (path) => {
  if (path.includes("/user-management/vendors")) return { module: "FINANCE", entityType: "VENDOR" };
  if (path.includes("/user-management/users")) return { module: "USER_MANAGEMENT", entityType: "USER" };
  if (path.includes("/vendors")) return { module: "VENDOR", entityType: "VENDOR" };
  if (path.includes("/products")) return { module: "PRODUCT", entityType: "PRODUCT" };
  if (path.includes("/orders")) return { module: "ORDER", entityType: "ORDER" };
  if (path.includes("/payout")) return { module: "FINANCE", entityType: "PAYOUT" };
  if (path.includes("/finance")) return { module: "FINANCE", entityType: "FINANCE" };
  if (path.includes("/support")) return { module: "SUPPORT", entityType: "SUPPORT_TICKET" };
  if (path.includes("/admin")) return { module: "PRODUCT", entityType: "PRODUCT" };
  if (path.includes("/auth")) return { module: "AUTH", entityType: "USER" };
  return { module: "SYSTEM", entityType: "SYSTEM" };
};

const targetIdFor = (req, entityType) => {
  const parts = req.path.split("/").filter(Boolean);
  const index = parts.findIndex((part) => ["users", "vendors", "products", "orders", "payouts", "support"].includes(part));
  if (index >= 0 && parts[index + 1] && !["bulk-review", "status", "commission"].includes(parts[index + 1])) return parts[index + 1];
  if (entityType === "PRODUCT" && req.params?.id) return req.params.id;
  return req.params?.id || req.body?.id || null;
};

const actionFor = (req, entityType) => {
  const path = req.path.toLowerCase();
  if (path.includes("bulk")) return `BULK_${entityType}_UPDATE`;
  if (path.includes("approve")) return `${entityType}_APPROVED`;
  if (path.includes("reject")) return `${entityType}_REJECTED`;
  if (path.includes("restore")) return `${entityType}_RESTORED`;
  if (path.includes("status")) return `${entityType}_STATUS_UPDATED`;
  if (path.includes("commission")) return "VENDOR_COMMISSION_UPDATED";
  if (path.includes("profile")) return "PROFILE_UPDATED";
  if (path.includes("password")) return "PASSWORD_UPDATED";
  if (path.includes("logout")) return "LOGOUT";
  if (req.method === "POST") return `${entityType}_CREATED`;
  if (req.method === "DELETE") return `${entityType}_DELETED`;
  return `${entityType}_UPDATED`;
};

const snapshot = async (entityType, id) => {
  if (!id) return null;
  const models = { USER: "user", VENDOR: "vendor", PRODUCT: "product", ORDER: "order", PAYOUT: "payoutRequest", SUPPORT_TICKET: "supportTicket" };
  const model = models[entityType];
  if (!model) return null;
  try { return await prisma[model].findUnique({ where: { id } }); } catch { return null; }
};

export const captureActivitySnapshot = async (req) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method) || !STAFF_ROLES.has(req.user?.role)) return;
  const resource = resourceFor(req.path);
  const entityId = targetIdFor(req, resource.entityType);
  req.activityContext = { ...resource, entityId, oldData: safeData(await snapshot(resource.entityType, entityId)) };
};

export const activityAudit = (req, res, next) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method) || req.path.startsWith("/api/activity-logs")) return next();
  res.on("finish", async () => {
    if (req.activityLogCreated || !req.user || !STAFF_ROLES.has(req.user.role)) return;
    const context = req.activityContext || resourceFor(req.path);
    try {
      await createActivityLog({ userId: req.user.id, action: actionFor(req, context.entityType), module: context.module, entityType: context.entityType, entityId: context.entityId || null, targetName: context.oldData?.name || context.oldData?.shopName || context.oldData?.orderNumber || context.entityId || "Bulk action", status: res.statusCode >= 400 ? "FAILED" : "SUCCESS", description: `${req.method} ${req.path}`, oldData: context.oldData || undefined, newData: safeData(req.body), req });
    } catch (error) { console.error("Activity audit write failed:", error.message); }
  });
  next();
};
