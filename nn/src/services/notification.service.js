import prisma from "../lib/prisma.js";

export const createNotification = async ({
  userId,
  title,
  message,
  type = "GENERAL",
  link = null,
}) => {
  if (!userId || !title || !message) return null;

  return prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
      link,
    },
  });
};