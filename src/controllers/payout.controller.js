import prisma from "../lib/prisma.js";
import createActivityLog from "../utils/createActivityLog.js";

export const requestPayout = async (req, res) => {
  try {
    const { amount, note } = req.body;

    const vendor = await prisma.vendor.findUnique({
      where: { userId: req.user.id },
    });

    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    if (amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }

    if (amount > vendor.availableBalance) {
      return res.status(400).json({ success: false, message: "Insufficient balance" });
    }

    const payout = await prisma.payoutRequest.create({
      data: {
        vendorId: vendor.id,
        amount,
        note,
        status: "PENDING",
      },
    });
await createActivityLog({
  userId: req.user.id,
  action: "PAYOUT_REQUEST_CREATED",
  entityType: "PAYOUT",
  entityId: payout.id,
  oldData: null,
  newData: {
    amount: payout.amount,
    status: payout.status,
    vendorId: payout.vendorId,
  },
  req,
});
const admins = await prisma.user.findMany({
  where: {
    role: {
      in: ["ADMIN", "SUPER_ADMIN"],
    },
  },
  select: {
    id: true,
  },
});

for (const admin of admins) {
  await createNotification({
    userId: admin.id,
    title: "New Payout Request",
    message: `${vendor.shopName} requested payout of ${amount}.`,
    type: "PAYOUT_REQUEST_CREATED",
    link: `/admin/payouts/${payout.id}`,
  });
}
    res.status(201).json({
      success: true,
      message: "Payout request submitted",
      payout,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getMyPayoutRequests = async (req, res) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { userId: req.user.id },
    });

    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    const payouts = await prisma.payoutRequest.findMany({
      where: { vendorId: vendor.id },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, payouts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllPayoutRequests = async (req, res) => {
  try {
    const payouts = await prisma.payoutRequest.findMany({
      include: {
        vendor: {
          include: {
            user: {
              select: { id: true, name: true, email: true, phone: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, payouts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePayoutStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["APPROVED", "REJECTED"];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payout status",
      });
    }

    const payout = await prisma.payoutRequest.findUnique({
      where: { id },
      include: { vendor: true },
    });

    if (!payout) {
      return res.status(404).json({ success: false, message: "Payout not found" });
    }

    if (payout.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Payout already processed",
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedPayout = await tx.payoutRequest.update({
        where: { id },
        data: { status },
      });

      if (status === "APPROVED") {
        await tx.vendor.update({
          where: { id: payout.vendorId },
          data: {
            availableBalance: {
              decrement: payout.amount,
            },
            totalWithdrawn: {
              increment: payout.amount,
            },
          },
        });
      }

      return updatedPayout;
    });
await createActivityLog({
  userId: req.user.id,
  action: status === "APPROVED" ? "PAYOUT_APPROVED" : "PAYOUT_REJECTED",
  entityType: "PAYOUT",
  entityId: updated.id,
  oldData: {
    status: payout.status,
    amount: payout.amount,
    vendorId: payout.vendorId,
  },
  newData: {
    status: updated.status,
    amount: updated.amount,
    vendorId: updated.vendorId,
  },
  req,
});
await createNotification({
  userId: payout.vendor.userId,
  title: status === "APPROVED" ? "Payout Approved" : "Payout Rejected",
  message:
    status === "APPROVED"
      ? `Your payout request of ${payout.amount} has been approved.`
      : `Your payout request of ${payout.amount} has been rejected.`,
  type: status === "APPROVED" ? "PAYOUT_APPROVED" : "PAYOUT_REJECTED",
  link: `/vendor/payouts/${payout.id}`,
});
    res.json({
      success: true,
      message: `Payout ${status.toLowerCase()} successfully`,
      payout: updated,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};