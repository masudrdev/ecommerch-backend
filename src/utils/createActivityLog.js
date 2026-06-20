import prisma from "../lib/prisma.js";

const createActivityLog = async ({
  userId,
  action,
  entityType,
  entityId,
  oldData,
  newData,
  req,
}) => {
  return await prisma.activityLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      oldData,
      newData,
      ipAddress: req?.ip,
      userAgent: req?.headers?.["user-agent"],
    },
  });
};

export default createActivityLog;