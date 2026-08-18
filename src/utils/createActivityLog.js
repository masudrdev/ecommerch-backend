import prisma from "../lib/prisma.js";

const createActivityLog = async ({ userId, action, module, entityType, entityId, targetName, status = "SUCCESS", description, oldData, newData, req }) => {
  if (req) req.activityLogCreated = true;
  return prisma.activityLog.create({
    data: { userId, action, module: module || entityType || null, entityType, entityId, targetName, status, description, oldData, newData, ipAddress: req?.ip, userAgent: req?.headers?.["user-agent"] },
  });
};

export default createActivityLog;
