import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import uploadToCloudinary from "../utils/uploadToCloudinary.js";
import deleteFromCloudinary from "../utils/deleteFromCloudinary.js";
import {
  managedUserSchema,
  managedVendorSchema,
} from "../validations/userManagement.validation.js";

const USER_ROLES = {
  customers: "CUSTOMER",
  admins: "ADMIN",
  "support-agents": "SUPPORT_AGENT",
};

const userSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  isEmailVerified: true,
  createdAt: true,
  updatedAt: true,
};

const isRealImage = (file) => {
  const bytes = file?.buffer;
  if (!bytes || bytes.length < 12) return false;
  if (file.mimetype === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.mimetype === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (file.mimetype === "image/webp") return bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
  return false;
};

const rejectProtectedFields = (body) => {
  const protectedFields = ["role", "status", "isEmailVerified", "permissions", "balance", "commission"];
  return protectedFields.some((field) => Object.prototype.hasOwnProperty.call(body || {}, field));
};

const ensureUniqueAccount = async ({ email, username }) => {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: email, mode: "insensitive" } },
        { username: { equals: username, mode: "insensitive" } },
      ],
    },
    select: { email: true, username: true },
  });
  if (existing?.email?.toLowerCase() === email.toLowerCase()) throw new Error("Email is already registered");
  if (existing?.username?.toLowerCase() === username.toLowerCase()) throw new Error("Username is already in use");
};

export const getManagedUsers = async (req, res) => {
  try {
    const role = USER_ROLES[req.params.group];
    if (!role) return res.status(400).json({ success: false, message: "Invalid user group" });
    const search = String(req.query.search || "").trim();
    const status = String(req.query.status || "ALL").trim();
    const where = {
      role,
      ...(status !== "ALL" ? { status } : {}),
      ...(search ? { OR: [
        { name: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ] } : {}),
    };
    const users = await prisma.user.findMany({ where, select: userSelect, orderBy: { createdAt: "desc" } });
    return res.json({ success: true, users });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createManagedAccount = async (req, res) => {
  let uploadedLogo = null;
  try {
    if (rejectProtectedFields(req.body)) {
      return res.status(400).json({ success: false, message: "Role, approval and protected account fields cannot be set during creation" });
    }
    const isVendor = req.params.group === "vendors";
    const forcedRole = USER_ROLES[req.params.group];
    if (!isVendor && !forcedRole) return res.status(400).json({ success: false, message: "Invalid user group" });
    const data = (isVendor ? managedVendorSchema : managedUserSchema).parse(req.body);
    const email = data.email.trim().toLowerCase();
    const username = data.username.trim();
    await ensureUniqueAccount({ email, username });

    if (isVendor) {
      const slugExists = await prisma.vendor.findUnique({ where: { shopSlug: data.shopSlug }, select: { id: true } });
      if (slugExists) return res.status(409).json({ success: false, message: "Shop slug is already in use" });
      if (req.file && !isRealImage(req.file)) return res.status(400).json({ success: false, message: "Please upload a valid JPG, PNG, or WebP Vendor logo" });
      if (req.file) uploadedLogo = await uploadToCloudinary(req.file.buffer, "friendbazar/vendor-logos");
    }

    const password = await bcrypt.hash(data.password, 10);
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name.trim(), username, email,
          phone: data.phone?.trim() || null,
          password,
          role: isVendor ? "CUSTOMER" : forcedRole,
          status: "ACTIVE",
          isEmailVerified: true,
          emailVerificationCode: null,
          emailVerificationExpires: null,
        },
        select: userSelect,
      });
      if (!isVendor) return { user, vendor: null };
      const vendor = await tx.vendor.create({
        data: {
          userId: user.id,
          shopName: data.shopName.trim(),
          shopSlug: data.shopSlug,
          description: data.description?.trim() || null,
          officeDistrict: data.officeDistrict?.trim() || null,
          officeUpazila: data.officeUpazila?.trim() || null,
          officeVillage: data.officeVillage?.trim() || null,
          shopLogo: uploadedLogo?.secure_url || null,
          status: "PENDING",
        },
      });
      return { user, vendor };
    });


    return res.status(201).json({
      success: true,
      message: isVendor
        ? "Vendor account created with PENDING application."
        : `${forcedRole.replaceAll("_", " ")} account created successfully.`,
      ...result,
    });
  } catch (error) {
    if (uploadedLogo?.public_id) await deleteFromCloudinary(uploadedLogo.public_id).catch(() => null);
    const message = error?.code === "P2002"
      ? "Email, username, or shop slug is already in use"
      : error?.issues?.[0]?.message || error.message || "Unable to create account";
    return res.status(400).json({ success: false, message });
  }
};

export const updateManagedUserStatus = async (req, res) => {
  try {
    const status = String(req.body.status || "").toUpperCase();
    if (!["ACTIVE", "PENDING", "BLOCKED"].includes(status)) return res.status(400).json({ success: false, message: "Invalid account status" });
    if (req.params.id === req.user.id) return res.status(400).json({ success: false, message: "You cannot change your own account status" });
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { status }, select: userSelect });
    return res.json({ success: true, user });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const updateVendorCommission = async (req, res) => {
  try {
    const commissionType = String(req.body.commissionType || "").toUpperCase();
    const commissionValue = Number(req.body.commissionValue);
    const commissionActive = req.body.commissionActive !== false;
    const effectiveFrom = req.body.effectiveFrom ? new Date(req.body.effectiveFrom) : new Date();
    if (!["PERCENTAGE", "FIXED"].includes(commissionType) || !Number.isFinite(commissionValue) || commissionValue < 0) return res.status(400).json({ success: false, message: "Enter a valid commission type and value" });
    if (commissionType === "PERCENTAGE" && commissionValue > 100) return res.status(400).json({ success: false, message: "Percentage commission cannot exceed 100" });
    if (Number.isNaN(effectiveFrom.getTime())) return res.status(400).json({ success: false, message: "Enter a valid effective date" });
    const vendor = await prisma.vendor.update({
      where: { id: req.params.id },
      data: { defaultCommissionType: commissionType, defaultCommissionValue: commissionValue, defaultCommissionActive: commissionActive, defaultCommissionEffectiveFrom: effectiveFrom },
      include: { user: { select: userSelect }, _count: { select: { products: true } } },
    });
    return res.json({ success: true, vendor, message: "Vendor default commission updated. It applies to future orders for products without a custom commission." });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
export const deductVendorBalance = async (req, res) => {
  try {
    const amount = req.body?.amount;
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: "Deduct amount must be a number greater than 0." });
    }
    if (!reason) {
      return res.status(400).json({ success: false, message: "Deduction reason is required." });
    }
    if (reason.length > 500) {
      return res.status(400).json({ success: false, message: "Deduction reason cannot exceed 500 characters." });
    }

    const deductionAmount = Math.round((amount + Number.EPSILON) * 100) / 100;
    if (deductionAmount <= 0) {
      return res.status(400).json({ success: false, message: "Deduct amount must be at least 0.01." });
    }
    const result = await prisma.$transaction(async (tx) => {
      const vendor = await tx.vendor.findUnique({
        where: { id: req.params.id },
        select: { id: true, userId: true, shopName: true, availableBalance: true },
      });
      if (!vendor) {
        const error = new Error("Vendor not found.");
        error.statusCode = 404;
        throw error;
      }

      const deduction = await tx.vendor.updateMany({
        where: { id: vendor.id, availableBalance: { gte: deductionAmount } },
        data: { availableBalance: { decrement: deductionAmount } },
      });
      if (deduction.count !== 1) {
        const error = new Error("Insufficient vendor balance.");
        error.statusCode = 409;
        throw error;
      }

      const updatedVendor = await tx.vendor.findUnique({
        where: { id: vendor.id },
        select: { id: true, shopName: true, availableBalance: true, totalWithdrawn: true },
      });
      const transaction = await tx.financeTransaction.create({
        data: {
          type: "ADMIN_DEDUCTION",
          amount: deductionAmount,
          status: "COMPLETED",
          description: reason,
          vendorId: vendor.id,
          userId: req.user.id,
        },
        select: { id: true, type: true, amount: true, status: true, description: true, vendorId: true, createdAt: true },
      });

      await tx.notification.create({
        data: {
          userId: vendor.userId,
          title: "Balance Deduction",
          message: `৳${deductionAmount.toLocaleString("en-BD")} has been deducted from your available balance. Reason: ${reason}`,
          type: "FINANCE",
          link: "/dashboard/payouts",
        },
      });
      await tx.activityLog.create({
        data: {
          userId: req.user.id,
          action: "VENDOR_BALANCE_DEDUCTION",
          module: "FINANCE",
          entityType: "VENDOR",
          entityId: vendor.id,
          targetName: vendor.shopName,
          status: "SUCCESS",
          description: `Deducted ৳${deductionAmount.toLocaleString("en-BD")} from ${vendor.shopName}. Reason: ${reason}`,
          oldData: { availableBalance: vendor.availableBalance },
          newData: { availableBalance: updatedVendor.availableBalance, amount: deductionAmount, reason, transactionId: transaction.id },
          ipAddress: req.ip || null,
          userAgent: req.headers?.["user-agent"] || null,
        },
      });

      return { vendor: updatedVendor, transaction };
    });

    req.activityLogCreated = true;
    return res.status(200).json({
      success: true,
      message: `৳${deductionAmount.toLocaleString("en-BD")} deducted from ${result.vendor.shopName}.`,
      ...result,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Unable to deduct vendor balance.",
    });
  }
};


