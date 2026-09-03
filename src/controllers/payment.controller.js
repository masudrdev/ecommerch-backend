import prisma from "../lib/prisma.js";
import createNotification from "../utils/createNotification.js";

const WALLET_METHODS = ["BKASH", "NAGAD", "ROCKET"];
const cleanMethod = (value) => String(value || "").trim().toUpperCase();
const cleanTxn = (value) => String(value || "").trim().toUpperCase();

const getSettings = async () => {
  const settings = await prisma.platformSetting.findUnique({ where: { id: "GLOBAL" } });
  return {
    BKASH: { enabled: settings?.bkashEnabled === true, number: settings?.bkashNumber || "" },
    NAGAD: { enabled: settings?.nagadEnabled === true, number: settings?.nagadNumber || "" },
    ROCKET: { enabled: settings?.rocketEnabled === true, number: settings?.rocketNumber || "" },
  };
};

export const calculatePaymentSummary = async (orderId, client = prisma) => {
  const order = await client.order.findUnique({
    where: { id: orderId },
    select: { id: true, totalAmount: true, paymentStatus: true },
  });
  if (!order) return null;
  const aggregate = await client.manualPaymentTransaction.aggregate({
    where: { orderId, status: "VERIFIED" },
    _sum: { verifiedAmount: true },
  });
  const verifiedWallet = Number(aggregate._sum.verifiedAmount || 0);
  const pendingCount = await client.manualPaymentTransaction.count({
    where: { orderId, status: "PENDING_VERIFICATION" },
  });
  const total = Number(order.totalAmount || 0);
  const settledByCompletion = order.paymentStatus === "PAID";
  const paid = settledByCompletion ? total : Math.min(verifiedWallet, total);
  const due = Math.max(total - paid, 0);
  const paymentStatus = due <= 0
    ? "PAID"
    : verifiedWallet > 0
      ? "PARTIALLY_PAID"
      : pendingCount > 0
        ? "PENDING"
        : "UNPAID";
  return { total, verifiedWallet, paid, due, pendingCount, paymentStatus };
};

const safeNotify = async (payload) => {
  try { await createNotification(payload); }
  catch (error) { console.error("Payment notification failed:", error?.message); }
};

export const getEnabledPaymentMethods = async (_req, res) => {
  try {
    const settings = await getSettings();
    return res.json({
      success: true,
      methods: WALLET_METHODS.filter((method) => settings[method].enabled && settings[method].number)
        .map((method) => ({ method, number: settings[method].number })),
    });
  } catch {
    return res.status(500).json({ success: false, message: "Unable to load payment methods" });
  }
};

export const getPaymentSettings = async (_req, res) => {
  try {
    return res.json({ success: true, settings: await getSettings() });
  } catch {
    return res.status(500).json({ success: false, message: "Unable to load payment settings" });
  }
};

export const updatePaymentSettings = async (req, res) => {
  try {
    const data = {};
    for (const method of WALLET_METHODS) {
      const key = method.toLowerCase();
      const enabled = req.body?.[key + "Enabled"] === true || req.body?.[key + "Enabled"] === "true";
      const number = String(req.body?.[key + "Number"] || "").trim();
      if (enabled && !number) return res.status(400).json({ success: false, message: method + " Send Money number is required when enabled" });
      if (number.length > 30) return res.status(400).json({ success: false, message: method + " number is invalid" });
      data[key + "Enabled"] = enabled;
      data[key + "Number"] = number || null;
    }
    await prisma.platformSetting.upsert({ where: { id: "GLOBAL" }, update: data, create: { id: "GLOBAL", ...data } });
    return res.json({ success: true, message: "Payment settings updated", settings: await getSettings() });
  } catch {
    return res.status(500).json({ success: false, message: "Unable to update payment settings" });
  }
};

export const getOrderPayments = async (req, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.orderId }, select: { id: true, userId: true } });
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    const staff = ["ADMIN", "SUPER_ADMIN"].includes(req.user.role);
    if (!staff && order.userId !== req.user.id) return res.status(403).json({ success: false, message: "Access denied" });
    const transactions = await prisma.manualPaymentTransaction.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, paymentMethod: true, transactionId: true, submittedAmount: true, senderNumber: true, verifiedAmount: true, status: true, verifiedAt: true, rejectionReason: true, createdAt: true, verifiedBy: { select: { id: true, name: true } } },
    });
    return res.json({ success: true, summary: await calculatePaymentSummary(order.id), transactions });
  } catch {
    return res.status(500).json({ success: false, message: "Unable to load payment history" });
  }
};

export const submitManualPayment = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const method = cleanMethod(req.body.paymentMethod);
    const transactionId = cleanTxn(req.body.transactionId);
    const submittedAmount = Number(req.body.submittedAmount);
    const senderNumber = String(req.body.senderNumber || "").trim();
    if (!WALLET_METHODS.includes(method)) return res.status(400).json({ success: false, message: "Invalid payment method" });
    if (transactionId.length < 4 || transactionId.length > 80) return res.status(400).json({ success: false, message: "Valid Transaction ID is required" });
    if (!/^[+0-9]{6,20}$/.test(senderNumber)) return res.status(400).json({ success: false, message: "Valid sender number is required" });
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, userId: true, orderNumber: true, orderStatus: true, paymentStatus: true } });
    if (!order || order.userId !== req.user.id) return res.status(404).json({ success: false, message: "Order not found" });
    if (["CANCELLED", "RETURNED", "REFUNDED"].includes(order.orderStatus) || order.paymentStatus === "PAID") return res.status(400).json({ success: false, message: "This order is not eligible for payment" });
    const settings = await getSettings();
    if (!settings[method].enabled || !settings[method].number) return res.status(400).json({ success: false, message: method + " is currently unavailable" });
    const summary = await calculatePaymentSummary(orderId);
    if (!Number.isFinite(submittedAmount) || submittedAmount <= 0 || submittedAmount > summary.due) return res.status(400).json({ success: false, message: "Payment amount must be within the remaining due" });
    const exists = await prisma.manualPaymentTransaction.findUnique({ where: { transactionId } });
    if (exists) return res.status(409).json({ success: false, message: "This Transaction ID has already been submitted" });
    let payment;
    try {
      payment = await prisma.$transaction(async (tx) => {
        const created = await tx.manualPaymentTransaction.create({ data: { orderId, submittedById: req.user.id, paymentMethod: method, transactionId, submittedAmount, senderNumber } });
        if (order.paymentStatus === "UNPAID") await tx.order.update({ where: { id: orderId }, data: { paymentMethod: method, paymentStatus: "PENDING" } });
        return created;
      });
    } catch (error) {
      if (error?.code === "P2002") return res.status(409).json({ success: false, message: "This Transaction ID has already been submitted" });
      throw error;
    }
    await safeNotify({ userId: order.userId, title: "Payment Submitted", message: "Your payment for order " + order.orderNumber + " has been submitted for verification.", type: "PAYMENT_SUBMITTED", link: "/dashboard/orders/" + order.id });
    return res.status(201).json({ success: true, message: "Payment submitted for verification", payment });
  } catch {
    return res.status(500).json({ success: false, message: "Unable to submit payment" });
  }
};


export const getCustomerPayments = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const status = String(req.query.status || "").trim().toUpperCase();
    const method = cleanMethod(req.query.method);
    const search = String(req.query.search || "").trim();
    const where = {
      ...(status ? { status } : {}),
      ...(method ? { paymentMethod: method } : {}),
      ...(search
        ? {
            OR: [
              { transactionId: { contains: search, mode: "insensitive" } },
              { senderNumber: { contains: search, mode: "insensitive" } },
              { order: { orderNumber: { contains: search, mode: "insensitive" } } },
              { order: { customerName: { contains: search, mode: "insensitive" } } },
              { submittedBy: { name: { contains: search, mode: "insensitive" } } },
              { submittedBy: { email: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
    const paymentSettings = await getSettings();
    const [items, total, pending, verified, rejected] = await Promise.all([
      prisma.manualPaymentTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          order: { select: { id: true, orderNumber: true, totalAmount: true, paymentStatus: true, customerName: true, phone: true } },
          submittedBy: { select: { id: true, name: true, email: true, phone: true } },
          verifiedBy: { select: { id: true, name: true } },
        },
      }),
      prisma.manualPaymentTransaction.count({ where }),
      prisma.manualPaymentTransaction.count({ where: { status: "PENDING_VERIFICATION" } }),
      prisma.manualPaymentTransaction.count({ where: { status: "VERIFIED" } }),
      prisma.manualPaymentTransaction.count({ where: { status: "REJECTED" } }),
    ]);
    return res.json({
      success: true,
      payments: items.map((item) => ({ ...item, marketplaceNumber: paymentSettings[item.paymentMethod]?.number || "" })),
      summary: { pending, verified, rejected },
      pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
    });
  } catch (error) {
    console.error("Customer payments list error:", error);
    return res.status(500).json({ success: false, message: "Unable to load customer payments" });
  }
};

export const verifyManualPayment = async (req, res) => {
  try {
    const verifiedAmount = Number(req.body.verifiedAmount);
    if (!Number.isFinite(verifiedAmount) || verifiedAmount <= 0) return res.status(400).json({ success: false, message: "Actual received amount must be greater than zero" });
    const existing = await prisma.manualPaymentTransaction.findUnique({ where: { id: req.params.id }, include: { order: { select: { id: true, userId: true, orderNumber: true } } } });
    if (!existing) return res.status(404).json({ success: false, message: "Payment transaction not found" });
    if (existing.status !== "PENDING_VERIFICATION") return res.status(400).json({ success: false, message: "This payment transaction has already been reviewed" });
    const before = await calculatePaymentSummary(existing.orderId);
    if (verifiedAmount > before.due) return res.status(400).json({ success: false, message: "Verified amount cannot exceed the remaining due" });
    const after = await prisma.$transaction(async (tx) => {
      await tx.manualPaymentTransaction.update({ where: { id: existing.id }, data: { status: "VERIFIED", verifiedAmount, verifiedAt: new Date(), verifiedById: req.user.id, rejectionReason: null } });
      const summary = await calculatePaymentSummary(existing.orderId, tx);
      await tx.order.update({ where: { id: existing.orderId }, data: { paymentStatus: summary.paymentStatus } });
      return summary;
    });
    const message = after.due <= 0
      ? "Your order payment is complete."
      : "Your payment was verified. BDT " + after.due.toLocaleString("en-BD") + " remains due.";
    await safeNotify({ userId: existing.order.userId, title: after.due <= 0 ? "Payment Complete" : "Payment Verified", message, type: after.due <= 0 ? "PAYMENT_PAID" : "PAYMENT_VERIFIED", link: "/dashboard/orders/" + existing.order.id });
    return res.json({ success: true, message: "Payment verified", summary: after });
  } catch {
    return res.status(500).json({ success: false, message: "Unable to verify payment" });
  }
};

export const rejectManualPayment = async (req, res) => {
  try {
    const reason = String(req.body.rejectionReason || "").trim();
    if (reason.length < 3) return res.status(400).json({ success: false, message: "Rejection reason is required" });
    const existing = await prisma.manualPaymentTransaction.findUnique({ where: { id: req.params.id }, include: { order: { select: { id: true, userId: true, orderNumber: true } } } });
    if (!existing) return res.status(404).json({ success: false, message: "Payment transaction not found" });
    if (existing.status !== "PENDING_VERIFICATION") return res.status(400).json({ success: false, message: "This payment transaction has already been reviewed" });
    const summary = await prisma.$transaction(async (tx) => {
      await tx.manualPaymentTransaction.update({ where: { id: existing.id }, data: { status: "REJECTED", rejectionReason: reason, verifiedAmount: null, verifiedAt: new Date(), verifiedById: req.user.id } });
      const next = await calculatePaymentSummary(existing.orderId, tx);
      await tx.order.update({ where: { id: existing.orderId }, data: { paymentStatus: next.paymentStatus } });
      return next;
    });
    await safeNotify({ userId: existing.order.userId, title: "Payment Rejected", message: "Your payment for order " + existing.order.orderNumber + " could not be verified.", type: "PAYMENT_REJECTED", link: "/dashboard/orders/" + existing.order.id });
    return res.json({ success: true, message: "Payment rejected", summary });
  } catch {
    return res.status(500).json({ success: false, message: "Unable to reject payment" });
  }
};
