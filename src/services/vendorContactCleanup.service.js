import prisma from "../lib/prisma.js";

const clearData = {
  pendingEmail: null,
  pendingPhone: null,
  contactChangeCode: null,
  contactChangeExpiresAt: null,
  contactChangeAttempts: 0,
  contactChangeLastSentAt: null,
};

export const clearExpiredVendorContactChanges = async () => {
  await prisma.vendor.updateMany({
    where: {
      contactChangeCode: { not: null },
      contactChangeExpiresAt: { lte: new Date() },
    },
    data: clearData,
  });
};

export const scheduleVendorContactChangeCleanup = (vendorId, expiresAt) => {
  const delay = Math.max(0, expiresAt.getTime() - Date.now()) + 50;
  const timer = setTimeout(async () => {
    try {
      await prisma.vendor.updateMany({
        where: {
          id: vendorId,
          contactChangeCode: { not: null },
          contactChangeExpiresAt: { lte: new Date() },
        },
        data: clearData,
      });
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Vendor contact cleanup failed:", error?.message);
      }
    }
  }, delay);
  timer.unref?.();
};

export const startVendorContactChangeCleanup = () => {
  clearExpiredVendorContactChanges().catch((error) => {
    if (process.env.NODE_ENV !== "production") {
      console.error("Vendor contact startup cleanup failed:", error?.message);
    }
  });

};