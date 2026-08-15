import prisma from "../lib/prisma.js";

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

export const updateManagedUserStatus = async (req, res) => {
  try {
    const status = String(req.body.status || "").toUpperCase();
    if (!['ACTIVE', 'PENDING', 'BLOCKED'].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid account status" });
    }
    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, message: "You cannot change your own account status" });
    }
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

    if (!['PERCENTAGE', 'FIXED'].includes(commissionType) || !Number.isFinite(commissionValue) || commissionValue < 0) {
      return res.status(400).json({ success: false, message: "Enter a valid commission type and value" });
    }
    if (commissionType === 'PERCENTAGE' && commissionValue > 100) {
      return res.status(400).json({ success: false, message: "Percentage commission cannot exceed 100" });
    }
    if (Number.isNaN(effectiveFrom.getTime())) {
      return res.status(400).json({ success: false, message: "Enter a valid effective date" });
    }

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
