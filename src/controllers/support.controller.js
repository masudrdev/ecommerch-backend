import prisma from "../lib/prisma.js";

const STAFF_ROLES = ["SUPPORT_AGENT", "ADMIN", "SUPER_ADMIN"];
const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

const TICKET_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_CUSTOMER",
  "WAITING_FOR_STAFF",
  "ESCALATED",
  "RESOLVED",
  "CLOSED",
  "REJECTED",
];

const TICKET_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const TICKET_CATEGORIES = [
  "ORDER_ISSUE",
  "PAYMENT_ISSUE",
  "REFUND_REQUEST",
  "WITHDRAWAL_ISSUE",
  "ACCOUNT_ISSUE",
  "PRODUCT_ISSUE",
  "DELIVERY_ISSUE",
  "TECHNICAL_ISSUE",
  "VENDOR_ISSUE",
  "OTHER",
];

const USER_SELECT = {
  id: true,
  name: true,
  username: true,
  email: true,
  role: true,
  avatar: true,
};

const STAFF_USER_SELECT = {
  id: true,
  name: true,
  username: true,
  email: true,
  role: true,
  avatar: true,
  status: true,
};

const isStaff = (role) => STAFF_ROLES.includes(role);
const isAdmin = (role) => ADMIN_ROLES.includes(role);

const cleanString = (value) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const createTicketNumber = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(1000 + Math.random() * 9000);

  return `FB-SUP-${timestamp}${random}`;
};

const findUniqueTicketNumber = async () => {
  let ticketNumber = createTicketNumber();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const exists = await prisma.supportTicket.findUnique({
      where: { ticketNumber },
      select: { id: true },
    });

    if (!exists) return ticketNumber;

    ticketNumber = createTicketNumber();
  }

  return `FB-SUP-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
};

const getTicketAccess = async (ticketId, user) => {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      userId: true,
      assignedToId: true,
      escalatedToId: true,
      status: true,
      isArchived: true,
    },
  });

  if (!ticket) {
    return {
      ticket: null,
      allowed: false,
    };
  }

  const owner = ticket.userId === user.id;
  const staff = isStaff(user.role);

  return {
    ticket,
    allowed: owner || staff,
    owner,
    staff,
  };
};

const ticketDetailsInclude = {
  user: {
    select: USER_SELECT,
  },
  assignedTo: {
    select: USER_SELECT,
  },
  escalatedBy: {
    select: USER_SELECT,
  },
  escalatedTo: {
    select: USER_SELECT,
  },
  messages: {
    include: {
      sender: {
        select: USER_SELECT,
      },
      attachments: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  },
  attachments: {
    where: {
      messageId: null,
    },
    orderBy: {
      createdAt: "asc",
    },
  },
  activities: {
    include: {
      user: {
        select: USER_SELECT,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  },
};

export const createTicket = async (req, res) => {
  try {
    const subject = cleanString(req.body.subject);
    const description = cleanString(
      req.body.description || req.body.message
    );
    const category = req.body.category || "OTHER";
    const priority = req.body.priority || "MEDIUM";
    const orderId = cleanString(req.body.orderId) || null;

    if (!subject) {
      return res.status(400).json({
        success: false,
        message: "Subject is required",
      });
    }

    if (!description) {
      return res.status(400).json({
        success: false,
        message: "Problem description is required",
      });
    }

    if (!TICKET_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket category",
      });
    }

    if (!TICKET_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket priority",
      });
    }

    const ticketNumber = await findUniqueTicketNumber();

    const ticket = await prisma.$transaction(async (tx) => {
      const createdTicket = await tx.supportTicket.create({
        data: {
          ticketNumber,
          userId: req.user.id,
          subject,
          description,
          category,
          priority,
          orderId,
          status: "OPEN",
          lastActivityAt: new Date(),
          messages: {
            create: {
              senderId: req.user.id,
              message: description,
              isInternal: false,
            },
          },
        },
        include: ticketDetailsInclude,
      });

      await tx.supportActivity.create({
        data: {
          ticketId: createdTicket.id,
          userId: req.user.id,
          action: "TICKET_CREATED",
          details: `${req.user.role} created support ticket ${ticketNumber}`,
        },
      });

      return createdTicket;
    });

    return res.status(201).json({
      success: true,
      message: "Support ticket created successfully",
      ticket,
    });
  } catch (error) {
    console.error("Create support ticket error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create support ticket",
    });
  }
};

export const getMyTickets = async (req, res) => {
  try {
    const {
      status,
      priority,
      category,
      search,
      page = "1",
      limit = "10",
    } = req.query;

    const pageNumber = Math.max(Number.parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(
      Math.max(Number.parseInt(limit, 10) || 10, 1),
      100
    );

    const where = {
      userId: req.user.id,
      isArchived: false,
    };

    if (status && TICKET_STATUSES.includes(status)) {
      where.status = status;
    }

    if (priority && TICKET_PRIORITIES.includes(priority)) {
      where.priority = priority;
    }

    if (category && TICKET_CATEGORIES.includes(category)) {
      where.category = category;
    }

    if (search) {
      const query = cleanString(search);

      if (query) {
        where.OR = [
          {
            ticketNumber: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            subject: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: query,
              mode: "insensitive",
            },
          },
        ];
      }
    }

    const [tickets, total] = await prisma.$transaction([
      prisma.supportTicket.findMany({
        where,
        include: {
          assignedTo: {
            select: USER_SELECT,
          },
          escalatedTo: {
            select: USER_SELECT,
          },
          messages: {
            select: {
              id: true,
              message: true,
              senderId: true,
              createdAt: true,
              isInternal: true,
              sender: {
                select: USER_SELECT,
              },
            },
            where: {
              isInternal: false,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
          _count: {
            select: {
              messages: true,
              attachments: true,
            },
          },
        },
        orderBy: {
          lastActivityAt: "desc",
        },
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
      }),
      prisma.supportTicket.count({ where }),
    ]);

    return res.json({
      success: true,
      tickets,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Get my support tickets error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load support tickets",
    });
  }
};

export const getAllTickets = async (req, res) => {
  try {
    const {
      status,
      priority,
      category,
      assignedToId,
      createdByRole,
      search,
      assigned = "all",
      archived = "false",
      page = "1",
      limit = "20",
    } = req.query;

    const pageNumber = Math.max(Number.parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(
      Math.max(Number.parseInt(limit, 10) || 20, 1),
      100
    );

    const where = {
      isArchived: archived === "true",
    };

    if (status && TICKET_STATUSES.includes(status)) {
      where.status = status;
    }

    if (priority && TICKET_PRIORITIES.includes(priority)) {
      where.priority = priority;
    }

    if (category && TICKET_CATEGORIES.includes(category)) {
      where.category = category;
    }

    if (assignedToId) {
      where.assignedToId = assignedToId;
    }

    if (createdByRole && ["CUSTOMER", "VENDOR"].includes(createdByRole)) {
      where.user = {
        role: createdByRole,
      };
    }

    if (assigned === "unassigned") {
      where.assignedToId = null;
    }

    if (assigned === "me") {
      where.assignedToId = req.user.id;
    }

    if (search) {
      const query = cleanString(search);

      if (query) {
        where.OR = [
          {
            ticketNumber: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            subject: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            user: {
              name: {
                contains: query,
                mode: "insensitive",
              },
            },
          },
          {
            user: {
              email: {
                contains: query,
                mode: "insensitive",
              },
            },
          },
          {
            user: {
              username: {
                contains: query,
                mode: "insensitive",
              },
            },
          },
        ];
      }
    }

    const [tickets, total] = await prisma.$transaction([
      prisma.supportTicket.findMany({
        where,
        include: {
          user: {
            select: USER_SELECT,
          },
          assignedTo: {
            select: USER_SELECT,
          },
          escalatedTo: {
            select: USER_SELECT,
          },
          messages: {
            where: {
              isInternal: false,
            },
            include: {
              sender: {
                select: USER_SELECT,
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
          _count: {
            select: {
              messages: true,
              attachments: true,
              activities: true,
            },
          },
        },
        orderBy: [
          {
            priority: "desc",
          },
          {
            lastActivityAt: "desc",
          },
        ],
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
      }),
      prisma.supportTicket.count({ where }),
    ]);

    return res.json({
      success: true,
      tickets,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Get all support tickets error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load support tickets",
    });
  }
};

export const getTicketDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: ticketDetailsInclude,
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
      });
    }

    const owner = ticket.userId === req.user.id;
    const staff = isStaff(req.user.role);

    if (!owner && !staff) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view this ticket",
      });
    }

    if (!staff) {
      ticket.messages = ticket.messages.filter(
        (message) => !message.isInternal
      );

      ticket.activities = ticket.activities.filter((activity) =>
        [
          "TICKET_CREATED",
          "REPLY_ADDED",
          "STATUS_CHANGED",
          "RESOLVED",
          "CLOSED",
          "REOPENED",
          "REJECTED",
        ].includes(activity.action)
      );

      ticket.attachments = ticket.attachments.filter(
        (attachment) => !attachment.isSensitive
      );
    }

    return res.json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error("Get support ticket details error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load ticket details",
    });
  }
};

export const replyTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const message = cleanString(req.body.message);

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Reply message is required",
      });
    }

    const access = await getTicketAccess(id, req.user);

    if (!access.ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
      });
    }

    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to reply to this ticket",
      });
    }

    if (["CLOSED", "REJECTED"].includes(access.ticket.status)) {
      return res.status(400).json({
        success: false,
        message: "Closed or rejected ticket cannot receive new replies",
      });
    }

    const replyResult = await prisma.$transaction(async (tx) => {
      const reply = await tx.supportMessage.create({
        data: {
          ticketId: id,
          senderId: req.user.id,
          message,
          isInternal: false,
        },
        include: {
          sender: {
            select: USER_SELECT,
          },
          attachments: true,
        },
      });

      const nextStatus = access.staff
        ? "WAITING_FOR_CUSTOMER"
        : "WAITING_FOR_STAFF";

      const updateData = {
        status: nextStatus,
        lastActivityAt: new Date(),
      };


      const currentTicket = await tx.supportTicket.findUnique({
        where: { id },
        select: {
          firstResponseAt: true,
        },
      });

      if (access.staff && !currentTicket.firstResponseAt) {
        updateData.firstResponseAt = new Date();
      } else {
        delete updateData.firstResponseAt;
      }

      const updatedTicket = await tx.supportTicket.update({
        where: { id },
        data: updateData,
      });

      await tx.supportActivity.create({
        data: {
          ticketId: id,
          userId: req.user.id,
          action: "REPLY_ADDED",
          details: `${req.user.role} added a public reply`,
        },
      });

      return {
        reply,
        ticket: updatedTicket,
      };
    });

    return res.status(201).json({
      success: true,
      message: "Reply added successfully",
      reply: replyResult.reply,
      ticket: replyResult.ticket,
    });
  } catch (error) {
    console.error("Support ticket reply error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to add reply",
    });
  }
};

export const addInternalNote = async (req, res) => {
  try {
    const { id } = req.params;
    const message = cleanString(req.body.message);

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Internal note is required",
      });
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
      });
    }

    const note = await prisma.$transaction(async (tx) => {
      const createdNote = await tx.supportMessage.create({
        data: {
          ticketId: id,
          senderId: req.user.id,
          message,
          isInternal: true,
        },
        include: {
          sender: {
            select: USER_SELECT,
          },
        },
      });

      await tx.supportTicket.update({
        where: { id },
        data: {
          lastActivityAt: new Date(),
        },
      });

      await tx.supportActivity.create({
        data: {
          ticketId: id,
          userId: req.user.id,
          action: "INTERNAL_NOTE_ADDED",
          details: `${req.user.role} added an internal note`,
        },
      });

      return createdNote;
    });

    return res.status(201).json({
      success: true,
      message: "Internal note added successfully",
      note,
    });
  } catch (error) {
    console.error("Add internal note error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to add internal note",
    });
  }
};

export const assignTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const assignedToId = cleanString(req.body.assignedToId) || req.user.id;

    const [ticket, agent] = await Promise.all([
      prisma.supportTicket.findUnique({
        where: { id },
        select: {
          id: true,
          assignedToId: true,
          status: true,
        },
      }),
      prisma.user.findUnique({
        where: { id: assignedToId },
        select: STAFF_USER_SELECT,
      }),
    ]);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
      });
    }

    if (!agent || !STAFF_ROLES.includes(agent.role)) {
      return res.status(400).json({
        success: false,
        message: "Selected user is not a valid support staff member",
      });
    }

    if (agent.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Selected support staff account is not active",
      });
    }

    if (
      req.user.role === "SUPPORT_AGENT" &&
      assignedToId !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Support Agent can only assign a ticket to themselves",
      });
    }

    const action = ticket.assignedToId ? "REASSIGNED" : "ASSIGNED";

    const updatedTicket = await prisma.$transaction(async (tx) => {
      const updated = await tx.supportTicket.update({
        where: { id },
        data: {
          assignedToId,
          status:
            ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status,
          lastActivityAt: new Date(),
        },
        include: {
          assignedTo: {
            select: USER_SELECT,
          },
        },
      });

      await tx.supportActivity.create({
        data: {
          ticketId: id,
          userId: req.user.id,
          action,
          oldValue: ticket.assignedToId,
          newValue: assignedToId,
          details: `Ticket assigned to ${agent.name}`,
        },
      });

      return updated;
    });

    return res.json({
      success: true,
      message: "Ticket assigned successfully",
      ticket: updatedTicket,
    });
  } catch (error) {
    console.error("Assign support ticket error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to assign ticket",
    });
  }
};

export const unassignTicket = async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      select: {
        id: true,
        assignedToId: true,
      },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
      });
    }

    const updatedTicket = await prisma.$transaction(async (tx) => {
      const updated = await tx.supportTicket.update({
        where: { id },
        data: {
          assignedToId: null,
          lastActivityAt: new Date(),
        },
      });

      await tx.supportActivity.create({
        data: {
          ticketId: id,
          userId: req.user.id,
          action: "REASSIGNED",
          oldValue: ticket.assignedToId,
          newValue: null,
          details: "Ticket was unassigned",
        },
      });

      return updated;
    });

    return res.json({
      success: true,
      message: "Ticket unassigned successfully",
      ticket: updatedTicket,
    });
  } catch (error) {
    console.error("Unassign support ticket error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to unassign ticket",
    });
  }
};

export const escalateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const escalatedToId = cleanString(req.body.escalatedToId);
    const escalationReason = cleanString(req.body.escalationReason);

    if (!escalatedToId) {
      return res.status(400).json({
        success: false,
        message: "Admin or Super Admin is required",
      });
    }

    if (!escalationReason) {
      return res.status(400).json({
        success: false,
        message: "Escalation reason is required",
      });
    }

    const [ticket, targetUser] = await Promise.all([
      prisma.supportTicket.findUnique({
        where: { id },
        select: {
          id: true,
          assignedToId: true,
          status: true,
        },
      }),
      prisma.user.findUnique({
        where: { id: escalatedToId },
        select: STAFF_USER_SELECT,
      }),
    ]);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
      });
    }

    if (!targetUser || !ADMIN_ROLES.includes(targetUser.role)) {
      return res.status(400).json({
        success: false,
        message: "Ticket can only be escalated to Admin or Super Admin",
      });
    }

    if (targetUser.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Selected Admin or Super Admin account is not active",
      });
    }

    const updatedTicket = await prisma.$transaction(async (tx) => {
      const updated = await tx.supportTicket.update({
        where: { id },
        data: {
          status: "ESCALATED",
          escalatedById: req.user.id,
          escalatedToId,
          escalationReason,
          lastActivityAt: new Date(),
        },
        include: {
          escalatedBy: {
            select: USER_SELECT,
          },
          escalatedTo: {
            select: USER_SELECT,
          },
        },
      });

      await tx.supportActivity.create({
        data: {
          ticketId: id,
          userId: req.user.id,
          action: "ESCALATED",
          newValue: escalatedToId,
          details: escalationReason,
        },
      });

      return updated;
    });

    return res.json({
      success: true,
      message: "Ticket escalated successfully",
      ticket: updatedTicket,
    });
  } catch (error) {
    console.error("Escalate support ticket error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to escalate ticket",
    });
  }
};

export const updateTicketPriority = async (req, res) => {
  try {
    const { id } = req.params;
    const { priority } = req.body;

    if (!TICKET_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket priority",
      });
    }

    const existingTicket = await prisma.supportTicket.findUnique({
      where: { id },
      select: {
        id: true,
        priority: true,
      },
    });

    if (!existingTicket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
      });
    }

    const ticket = await prisma.$transaction(async (tx) => {
      const updated = await tx.supportTicket.update({
        where: { id },
        data: {
          priority,
          lastActivityAt: new Date(),
        },
      });

      await tx.supportActivity.create({
        data: {
          ticketId: id,
          userId: req.user.id,
          action: "PRIORITY_CHANGED",
          oldValue: existingTicket.priority,
          newValue: priority,
          details: `Priority changed from ${existingTicket.priority} to ${priority}`,
        },
      });

      return updated;
    });

    return res.json({
      success: true,
      message: "Ticket priority updated successfully",
      ticket,
    });
  } catch (error) {
    console.error("Update ticket priority error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update priority",
    });
  }
};

export const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const resolutionSummary = cleanString(req.body.resolutionSummary);

    if (!TICKET_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket status",
      });
    }

    if (
      ["RESOLVED", "REJECTED"].includes(status) &&
      !resolutionSummary
    ) {
      return res.status(400).json({
        success: false,
        message: "Resolution or rejection summary is required",
      });
    }

    const existingTicket = await prisma.supportTicket.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        userId: true,
      },
    });

    if (!existingTicket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
      });
    }

    const updateData = {
      status,
      lastActivityAt: new Date(),
    };

    let activityAction = "STATUS_CHANGED";

    if (status === "RESOLVED") {
      updateData.resolvedAt = new Date();
      updateData.resolutionSummary = resolutionSummary;
      activityAction = "RESOLVED";
    }

    if (status === "CLOSED") {
      updateData.closedAt = new Date();
      activityAction = "CLOSED";
    }

    if (status === "REJECTED") {
      updateData.closedAt = new Date();
      updateData.resolutionSummary = resolutionSummary;
      activityAction = "REJECTED";
    }

    if (
      status === "OPEN" &&
      ["RESOLVED", "CLOSED", "REJECTED"].includes(existingTicket.status)
    ) {
      updateData.resolvedAt = null;
      updateData.closedAt = null;
      activityAction = "REOPENED";
    }

    const ticket = await prisma.$transaction(async (tx) => {
      const updated = await tx.supportTicket.update({
        where: { id },
        data: updateData,
      });

      await tx.supportActivity.create({
        data: {
          ticketId: id,
          userId: req.user.id,
          action: activityAction,
          oldValue: existingTicket.status,
          newValue: status,
          details:
            resolutionSummary ||
            `Status changed from ${existingTicket.status} to ${status}`,
        },
      });

      return updated;
    });

    return res.json({
      success: true,
      message: "Ticket status updated successfully",
      ticket,
    });
  } catch (error) {
    console.error("Update ticket status error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update ticket status",
    });
  }
};

export const closeMyTicket = async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
      },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
      });
    }

    if (ticket.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You can only close your own ticket",
      });
    }

    if (ticket.status !== "RESOLVED") {
      return res.status(400).json({
        success: false,
        message: "Only a resolved ticket can be closed",
      });
    }

    const updatedTicket = await prisma.$transaction(async (tx) => {
      const updated = await tx.supportTicket.update({
        where: { id },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
          lastActivityAt: new Date(),
        },
      });

      await tx.supportActivity.create({
        data: {
          ticketId: id,
          userId: req.user.id,
          action: "CLOSED",
          oldValue: ticket.status,
          newValue: "CLOSED",
          details: "Ticket closed by ticket creator",
        },
      });

      return updated;
    });

    return res.json({
      success: true,
      message: "Ticket closed successfully",
      ticket: updatedTicket,
    });
  } catch (error) {
    console.error("Close own support ticket error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to close ticket",
    });
  }
};

export const reopenMyTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const reason = cleanString(req.body.reason);

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
      },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
      });
    }

    if (ticket.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You can only reopen your own ticket",
      });
    }

    if (!["RESOLVED", "CLOSED"].includes(ticket.status)) {
      return res.status(400).json({
        success: false,
        message: "Only resolved or closed ticket can be reopened",
      });
    }

    const updatedTicket = await prisma.$transaction(async (tx) => {
      const updated = await tx.supportTicket.update({
        where: { id },
        data: {
          status: "OPEN",
          resolvedAt: null,
          closedAt: null,
          lastActivityAt: new Date(),
        },
      });

      if (reason) {
        await tx.supportMessage.create({
          data: {
            ticketId: id,
            senderId: req.user.id,
            message: reason,
            isInternal: false,
          },
        });
      }

      await tx.supportActivity.create({
        data: {
          ticketId: id,
          userId: req.user.id,
          action: "REOPENED",
          oldValue: ticket.status,
          newValue: "OPEN",
          details: reason || "Ticket reopened by ticket creator",
        },
      });

      return updated;
    });

    return res.json({
      success: true,
      message: "Ticket reopened successfully",
      ticket: updatedTicket,
    });
  } catch (error) {
    console.error("Reopen own support ticket error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to reopen ticket",
    });
  }
};

export const rateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const rating = Number(req.body.rating);
    const feedback = cleanString(req.body.feedback);

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be an integer between 1 and 5",
      });
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
      },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
      });
    }

    if (ticket.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You can only rate your own ticket",
      });
    }

    if (!["RESOLVED", "CLOSED"].includes(ticket.status)) {
      return res.status(400).json({
        success: false,
        message: "Only resolved or closed ticket can be rated",
      });
    }

    const updatedTicket = await prisma.$transaction(async (tx) => {
      const updated = await tx.supportTicket.update({
        where: { id },
        data: {
          customerRating: rating,
          customerFeedback: feedback || null,
          lastActivityAt: new Date(),
        },
      });

      await tx.supportActivity.create({
        data: {
          ticketId: id,
          userId: req.user.id,
          action: "RATING_ADDED",
          newValue: String(rating),
          details: feedback || `Customer added ${rating} star rating`,
        },
      });

      return updated;
    });

    return res.json({
      success: true,
      message: "Support rating submitted successfully",
      ticket: updatedTicket,
    });
  } catch (error) {
    console.error("Rate support ticket error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to submit rating",
    });
  }
};

export const archiveTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const isArchived =
      req.body.isArchived === true || req.body.isArchived === "true";

    const existingTicket = await prisma.supportTicket.findUnique({
      where: { id },
      select: {
        id: true,
        isArchived: true,
      },
    });

    if (!existingTicket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
      });
    }

    const ticket = await prisma.$transaction(async (tx) => {
      const updated = await tx.supportTicket.update({
        where: { id },
        data: {
          isArchived,
          lastActivityAt: new Date(),
        },
      });

      await tx.supportActivity.create({
        data: {
          ticketId: id,
          userId: req.user.id,
          action: "ARCHIVED",
          oldValue: String(existingTicket.isArchived),
          newValue: String(isArchived),
          details: isArchived ? "Ticket archived" : "Ticket restored",
        },
      });

      return updated;
    });

    return res.json({
      success: true,
      message: isArchived
        ? "Ticket archived successfully"
        : "Ticket restored successfully",
      ticket,
    });
  } catch (error) {
    console.error("Archive support ticket error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to archive ticket",
    });
  }
};

export const getSupportStaff = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: {
          in: STAFF_ROLES,
        },
        status: "ACTIVE",
      },
      select: STAFF_USER_SELECT,
      orderBy: [
        {
          role: "asc",
        },
        {
          name: "asc",
        },
      ],
    });

    return res.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Get support staff error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load support staff",
    });
  }
};

export const getAdminUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: {
          in: ADMIN_ROLES,
        },
        status: "ACTIVE",
      },
      select: STAFF_USER_SELECT,
      orderBy: [
        {
          role: "desc",
        },
        {
          name: "asc",
        },
      ],
    });

    return res.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Get admin users error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load Admin users",
    });
  }
};

export const getSupportDashboardStats = async (req, res) => {
  try {
    const assignedFilter =
      req.user.role === "SUPPORT_AGENT"
        ? {
            OR: [
              {
                assignedToId: req.user.id,
              },
              {
                assignedToId: null,
              },
            ],
          }
        : {};

    const baseWhere = {
      isArchived: false,
      ...assignedFilter,
    };

    const [
      total,
      open,
      unassigned,
      assignedToMe,
      inProgress,
      waitingForCustomer,
      waitingForStaff,
      escalated,
      resolved,
      closed,
      urgent,
      recentTickets,
      ratingAggregate,
    ] = await prisma.$transaction([
      prisma.supportTicket.count({
        where: baseWhere,
      }),
      prisma.supportTicket.count({
        where: {
          ...baseWhere,
          status: "OPEN",
        },
      }),
      prisma.supportTicket.count({
        where: {
          ...baseWhere,
          assignedToId: null,
        },
      }),
      prisma.supportTicket.count({
        where: {
          isArchived: false,
          assignedToId: req.user.id,
        },
      }),
      prisma.supportTicket.count({
        where: {
          ...baseWhere,
          status: "IN_PROGRESS",
        },
      }),
      prisma.supportTicket.count({
        where: {
          ...baseWhere,
          status: "WAITING_FOR_CUSTOMER",
        },
      }),
      prisma.supportTicket.count({
        where: {
          ...baseWhere,
          status: "WAITING_FOR_STAFF",
        },
      }),
      prisma.supportTicket.count({
        where: {
          ...baseWhere,
          status: "ESCALATED",
        },
      }),
      prisma.supportTicket.count({
        where: {
          ...baseWhere,
          status: "RESOLVED",
        },
      }),
      prisma.supportTicket.count({
        where: {
          ...baseWhere,
          status: "CLOSED",
        },
      }),
      prisma.supportTicket.count({
        where: {
          ...baseWhere,
          priority: "URGENT",
          status: {
            notIn: ["RESOLVED", "CLOSED", "REJECTED"],
          },
        },
      }),
      prisma.supportTicket.findMany({
        where: baseWhere,
        include: {
          user: {
            select: USER_SELECT,
          },
          assignedTo: {
            select: USER_SELECT,
          },
        },
        orderBy: {
          lastActivityAt: "desc",
        },
        take: 8,
      }),
      prisma.supportTicket.aggregate({
        where: {
          ...baseWhere,
          customerRating: {
            not: null,
          },
        },
        _avg: {
          customerRating: true,
        },
        _count: {
          customerRating: true,
        },
      }),
    ]);

    return res.json({
      success: true,
      stats: {
        total,
        open,
        unassigned,
        assignedToMe,
        inProgress,
        waitingForCustomer,
        waitingForStaff,
        escalated,
        resolved,
        closed,
        urgent,
        averageRating: ratingAggregate._avg.customerRating || 0,
        totalRatings: ratingAggregate._count.customerRating,
      },
      recentTickets,
    });
  } catch (error) {
    console.error("Support dashboard stats error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load dashboard statistics",
    });
  }
};