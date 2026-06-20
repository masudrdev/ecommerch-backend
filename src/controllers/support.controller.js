import prisma from "../lib/prisma.js";

export const createTicket = async (req, res) => {
  try {
    const { subject, category, message, orderId } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Subject and message are required",
      });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: req.user.id,
        subject,
        category,
        orderId,
        messages: {
          create: {
            senderId: req.user.id,
            message,
          },
        },
      },
      include: {
        messages: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Support ticket created successfully",
      ticket,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getMyTickets = async (req, res) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: req.user.id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, tickets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllTickets = async (req, res) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
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
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, tickets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTicketDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
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
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                username: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    const isOwner = ticket.userId === req.user.id;
    const isSupport = ["SUPPORT_AGENT", "ADMIN", "SUPER_ADMIN"].includes(
      req.user.role
    );

    if (!isOwner && !isSupport) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    res.json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const replyTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    const isOwner = ticket.userId === req.user.id;
    const isSupport = ["SUPPORT_AGENT", "ADMIN", "SUPER_ADMIN"].includes(
      req.user.role
    );

    if (!isOwner && !isSupport) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const reply = await prisma.supportMessage.create({
      data: {
        ticketId: id,
        senderId: req.user.id,
        message,
      },
    });

    await prisma.supportTicket.update({
      where: { id },
      data: {
        status: isSupport ? "PENDING" : "OPEN",
      },
    });

    res.status(201).json({
      success: true,
      message: "Reply added successfully",
      reply,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["OPEN", "PENDING", "RESOLVED", "CLOSED"];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket status",
      });
    }

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: { status },
    });

    res.json({
      success: true,
      message: "Ticket status updated successfully",
      ticket,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};