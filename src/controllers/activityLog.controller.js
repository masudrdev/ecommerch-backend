import prisma from "../lib/prisma.js";

export const getActivityLogs = async (req, res) => {
  try {
    const {
      search = "",
      actorId = "ALL",
      module = "ALL",
      action = "ALL",
      status = "ALL",
      dateFrom = "",
      dateTo = "",
      page = 1,
      limit = 10,
    } = req.query;

    const currentPage = Math.max(Number(page) || 1, 1);
    const pageLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
    const skip = (currentPage - 1) * pageLimit;

    const where = {};

    if (actorId !== "ALL") {
      where.userId = actorId;
    }

    if (module !== "ALL") {
      where.module = module;
    }

    if (action !== "ALL") {
      where.action = action;
    }

    if (status !== "ALL") {
      where.status = status;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};

      if (dateFrom) {
        where.createdAt.gte = new Date(`${dateFrom}T00:00:00`);
      }

      if (dateTo) {
        where.createdAt.lte = new Date(`${dateTo}T23:59:59.999`);
      }
    }

    if (search.trim()) {
      const text = search.trim();

      where.OR = [
        {
          action: {
            contains: text,
            mode: "insensitive",
          },
        },
        {
          module: {
            contains: text,
            mode: "insensitive",
          },
        },
        {
          targetName: {
            contains: text,
            mode: "insensitive",
          },
        },
        {
          entityType: {
            contains: text,
            mode: "insensitive",
          },
        },
        {
          entityId: {
            contains: text,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: text,
            mode: "insensitive",
          },
        },
        {
          user: {
            is: {
              OR: [
                {
                  name: {
                    contains: text,
                    mode: "insensitive",
                  },
                },
                {
                  username: {
                    contains: text,
                    mode: "insensitive",
                  },
                },
                {
                  email: {
                    contains: text,
                    mode: "insensitive",
                  },
                },
              ],
            },
          },
        },
      ];
    }

  const [
  logs,
  total,
  actorRows,
  moduleRows,
  actionRows,
  statusRows,
] = await Promise.all([
  prisma.activityLog.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    skip,
    take: pageLimit,
  }),

  prisma.activityLog.count({
    where,
  }),

  prisma.activityLog.findMany({
    where: {
      userId: {
        not: null,
      },
    },
    distinct: ["userId"],
    select: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
        },
      },
    },
  }),

  prisma.activityLog.findMany({
    where: {
      module: {
        not: null,
      },
    },
    distinct: ["module"],
    select: {
      module: true,
    },
  }),

  prisma.activityLog.findMany({
    distinct: ["action"],
    select: {
      action: true,
    },
  }),

  prisma.activityLog.findMany({
    distinct: ["status"],
    select: {
      status: true,
    },
  }),
]);

    const actors = actorRows
      .map((item) => item.user)
      .filter(Boolean)
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    const modules = moduleRows
      .map((item) => item.module)
      .filter(Boolean)
      .sort();

    const actions = actionRows
      .map((item) => item.action)
      .filter(Boolean)
      .sort();

    const statuses = statusRows
      .map((item) => item.status)
      .filter(Boolean)
      .sort();

    const totalPages = Math.max(Math.ceil(total / pageLimit), 1);

    res.json({
      success: true,

      logs,

      filters: {
        actors,
        modules,
        actions,
        statuses,
      },

      pagination: {
        total,
        page: currentPage,
        limit: pageLimit,
        totalPages,
        hasPreviousPage: currentPage > 1,
        hasNextPage: currentPage < totalPages,
      },
    });
  } catch (error) {
    console.error("Get activity logs error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getActivityLogById = async (req, res) => {
  try {
    const { id } = req.params;

    const log = await prisma.activityLog.findUnique({
      where: {
        id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!log) {
      return res.status(404).json({
        success: false,
        message: "Activity log not found",
      });
    }

    return res.json({
      success: true,
      log,
    });
  } catch (error) {
    console.error("Get activity log by ID error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};