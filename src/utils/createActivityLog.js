import prisma from "../lib/prisma.js";

const createActivityLog = async ({
  userId,
  action,
  module = null,
  entityType,
  entityId,
  targetName = null,
  status = "SUCCESS",
  description = null,
  oldData = null,
  newData = null,
  req,
}) => {
  return await prisma.activityLog.create({
    data: {
      userId,
      action,
      module,
      entityType,
      entityId,
      targetName,
      status,
      description,
      oldData,
      newData,
      ipAddress: req?.ip || null,
      userAgent: req?.headers?.["user-agent"] || null,
    },
  });
};

export default createActivityLog;