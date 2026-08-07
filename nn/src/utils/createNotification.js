import prisma from "../lib/prisma.js";

const createNotification = async ({
  userId,
  title,
  message,
  type,
  link,
}) => {
  if (!userId) return null;

  return await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
      link,
    },
  });
};

export default createNotification;