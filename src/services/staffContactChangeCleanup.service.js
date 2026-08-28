import prisma from "../lib/prisma.js";

export const clearExpiredStaffContactChanges = async () => {
  await prisma.staffContactChange.deleteMany({
    where: {
      OR: [
        { expiresAt: { lte: new Date() }, authorizationHash: null },
        { authorizationExpiresAt: { lte: new Date() } },
      ],
    },
  });
};

export const scheduleStaffContactChangeCleanup = (challengeId, expiresAt) => {
  const delay = Math.max(0, expiresAt.getTime() - Date.now()) + 50;
  const timer = setTimeout(async () => {
    try {
      await prisma.staffContactChange.deleteMany({
        where: {
          id: challengeId,
          OR: [
            { expiresAt: { lte: new Date() }, authorizationHash: null },
            { authorizationExpiresAt: { lte: new Date() } },
          ],
        },
      });
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.error("Staff contact cleanup failed:", error?.message);
    }
  }, delay);
  timer.unref?.();
};

export const startStaffContactChangeCleanup = () => {
  clearExpiredStaffContactChanges().catch((error) => {
    if (process.env.NODE_ENV !== "production") console.error("Staff contact startup cleanup failed:", error?.message);
  });
};