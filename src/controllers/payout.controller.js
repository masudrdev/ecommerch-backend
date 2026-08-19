import prisma from "../lib/prisma.js";
import createActivityLog from "../utils/createActivityLog.js";
import createNotification from "../utils/createNotification.js";

const MINIMUM_PAYOUT_AMOUNT = 100;

const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

 
export const getMyPayoutSummary = async (req, res) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: {
        userId: req.user.id,
      },
      select: {
        id: true,
        shopName: true,
        availableBalance: true,
        totalWithdrawn: true,
      },
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const payoutGroups = await prisma.payoutRequest.groupBy({
      by: ["status"],
      where: {
        vendorId: vendor.id,
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    const grouped = payoutGroups.reduce((result, item) => {
      result[item.status] = {
        amount: roundMoney(item._sum.amount || 0),
        count: item._count.id || 0,
      };

      return result;
    }, {});

    return res.status(200).json({
      success: true,
      summary: {
        vendorId: vendor.id,
        shopName: vendor.shopName,
        availableBalance: roundMoney(vendor.availableBalance),
        totalWithdrawn: roundMoney(vendor.totalWithdrawn),

        pendingAmount: grouped.PENDING?.amount || 0,
        approvedAmount: grouped.APPROVED?.amount || 0,
        paidAmount: grouped.PAID?.amount || 0,
        rejectedAmount: grouped.REJECTED?.amount || 0,
        cancelledAmount: grouped.CANCELLED?.amount || 0,

        minimumPayoutAmount: MINIMUM_PAYOUT_AMOUNT,
      },
    });
  } catch (error) {
    console.error("Get payout summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load payout summary",
      error: error.message,
    });
  }
};

 
// export const requestPayout = async (req, res) => {
//   try {
//     const {
//       amount,
//       paymentMethod,
//       accountName,
//       accountNumber,
//       note,
//     } = req.body;

//     const payoutAmount = roundMoney(amount);

//     if (!Number.isFinite(payoutAmount) || payoutAmount <= 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Enter a valid payout amount",
//       });
//     }

//     if (payoutAmount < MINIMUM_PAYOUT_AMOUNT) {
//       return res.status(400).json({
//         success: false,
//         message: `Minimum payout amount is ৳${MINIMUM_PAYOUT_AMOUNT}`,
//       });
//     }

//     if (!paymentMethod?.trim()) {
//       return res.status(400).json({
//         success: false,
//         message: "Payment method is required",
//       });
//     }

//     if (!accountNumber?.trim()) {
//       return res.status(400).json({
//         success: false,
//         message: "Account number is required",
//       });
//     }

//     const result = await prisma.$transaction(async (tx) => {
//       const vendor = await tx.vendor.findUnique({
//         where: {
//           userId: req.user.id,
//         },
//       });

//       if (!vendor) {
//         const error = new Error("Vendor not found");
//         error.statusCode = 404;
//         throw error;
//       }

//       if (vendor.status !== "APPROVED") {
//         const error = new Error(
//           "Only approved vendors can request payouts"
//         );
//         error.statusCode = 403;
//         throw error;
//       }

//       /*
//        * একই সময়ে একাধিক request এলেও balance negative হবে না।
//        * Balance যথেষ্ট থাকলেই decrement হবে।
//        */
//       const balanceUpdate = await tx.vendor.updateMany({
//         where: {
//           id: vendor.id,
//           availableBalance: {
//             gte: payoutAmount,
//           },
//         },
//         data: {
//           availableBalance: {
//             decrement: payoutAmount,
//           },
//         },
//       });

//       if (balanceUpdate.count !== 1) {
//         const error = new Error("Insufficient available balance");
//         error.statusCode = 400;
//         throw error;
//       }

//       const payout = await tx.payoutRequest.create({
//         data: {
//           vendorId: vendor.id,
//           amount: payoutAmount,
//           status: "PENDING",

//           paymentMethod: paymentMethod.trim().toUpperCase(),
//           accountName: accountName?.trim() || null,
//           accountNumber: accountNumber.trim(),
//           vendorNote: note?.trim() || null,
//         },
//       });

//       const updatedVendor = await tx.vendor.findUnique({
//         where: {
//           id: vendor.id,
//         },
//         select: {
//           id: true,
//           shopName: true,
//           availableBalance: true,
//         },
//       });

//       return {
//         payout,
//         vendor: updatedVendor,
//       };
//     });

//     await createActivityLog({
//       userId: req.user.id,
//       action: "PAYOUT_REQUEST_CREATED",
//       entityType: "PAYOUT",
//       entityId: result.payout.id,
//       oldData: null,
//       newData: {
//         vendorId: result.payout.vendorId,
//         amount: result.payout.amount,
//         status: result.payout.status,
//         paymentMethod: result.payout.paymentMethod,
//         remainingBalance: result.vendor.availableBalance,
//       },
//       req,
//     });

//     const superAdmins = await prisma.user.findMany({
//       where: {
//         role: "SUPER_ADMIN",
//         status: "ACTIVE",
//       },
//       select: {
//         id: true,
//       },
//     });

//     await Promise.allSettled(
//       superAdmins.map((admin) =>
//         createNotification({
//           userId: admin.id,
//           title: "New Payout Request",
//           message: `${result.vendor.shopName} requested a payout of ৳${result.payout.amount}.`,
//           type: "PAYOUT_REQUEST_CREATED",
//           link: "/dashboard/finance",
//         })
//       )
//     );

//     return res.status(201).json({
//       success: true,
//       message: "Payout request submitted successfully",
//       payout: result.payout,
//       availableBalance: roundMoney(result.vendor.availableBalance),
//     });
//   } catch (error) {
//     console.error("Request payout error:", error);

//     return res.status(error.statusCode || 400).json({
//       success: false,
//       message: error.message || "Failed to submit payout request",
//     });
//   }
// };
export const requestPayout = async (req, res) => {
  try {
    const {
      amount,
      paymentMethod,
      accountName,
      accountNumber,
      note,
    } = req.body;

    const payoutAmount = roundMoney(amount);

    if (!Number.isFinite(payoutAmount) || payoutAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid payout amount",
      });
    }

    if (payoutAmount < MINIMUM_PAYOUT_AMOUNT) {
      return res.status(400).json({
        success: false,
        message: `Minimum payout amount is ৳${MINIMUM_PAYOUT_AMOUNT}`,
      });
    }

    if (!paymentMethod?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Payment method is required",
      });
    }

    if (!accountNumber?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Account number is required",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const vendor = await tx.vendor.findUnique({
        where: {
          userId: req.user.id,
        },
      });

      if (!vendor) {
        const error = new Error("Vendor not found");
        error.statusCode = 404;
        throw error;
      }

      if (vendor.status !== "APPROVED") {
        const error = new Error(
          "Only approved vendors can request payouts"
        );
        error.statusCode = 403;
        throw error;
      }

      const previousBalance = roundMoney(
        vendor.availableBalance
      );

      const balanceUpdate = await tx.vendor.updateMany({
        where: {
          id: vendor.id,
          availableBalance: {
            gte: payoutAmount,
          },
        },
        data: {
          availableBalance: {
            decrement: payoutAmount,
          },
        },
      });

      if (balanceUpdate.count !== 1) {
        const error = new Error(
          "Insufficient available balance"
        );
        error.statusCode = 400;
        throw error;
      }

      const payout = await tx.payoutRequest.create({
        data: {
          vendorId: vendor.id,
          amount: payoutAmount,
          status: "PENDING",
          paymentMethod: paymentMethod
            .trim()
            .toUpperCase(),
          accountName:
            accountName?.trim() || null,
          accountNumber:
            accountNumber.trim(),
          vendorNote:
            note?.trim() || null,
        },
      });

      const updatedVendor =
        await tx.vendor.findUnique({
          where: {
            id: vendor.id,
          },
          select: {
            id: true,
            shopName: true,
            availableBalance: true,
          },
        });

      const newBalance = roundMoney(
        updatedVendor.availableBalance
      );

      return {
        payout,
        vendor: updatedVendor,
        previousBalance,
        newBalance,
      };
    });

    await createActivityLog({
      userId: req.user.id,

      action: "PAYOUT_REQUEST_CREATED",

      module: "PAYOUT",
      entityType: "PAYOUT",
      entityId: result.payout.id,

      targetName:
        result.vendor.shopName ||
        result.payout.id,

      status: "SUCCESS",

      description: `Payout request created for ৳${result.payout.amount}`,

      oldData: {
        balance: result.previousBalance,
      },

      newData: {
        balance: result.newBalance,
        payoutAmount: result.payout.amount,
        status: result.payout.status,
        paymentMethod:
          result.payout.paymentMethod,
      },

      req,
    });

    const superAdmins =
      await prisma.user.findMany({
        where: {
          role: "SUPER_ADMIN",
          status: "ACTIVE",
        },
        select: {
          id: true,
        },
      });

    await Promise.allSettled(
      superAdmins.map((admin) =>
        createNotification({
          userId: admin.id,
          title: "New Payout Request",
          message: `${result.vendor.shopName} requested a payout of ৳${result.payout.amount}.`,
          type: "PAYOUT_REQUEST_CREATED",
          link: "/dashboard/finance",
        })
      )
    );

    return res.status(201).json({
      success: true,
      message:
        "Payout request submitted successfully",
      payout: result.payout,
      availableBalance: roundMoney(
        result.vendor.availableBalance
      ),
    });
  } catch (error) {
    console.error(
      "Request payout error:",
      error
    );

    return res
      .status(error.statusCode || 400)
      .json({
        success: false,
        message:
          error.message ||
          "Failed to submit payout request",
      });
  }
};
 
export const getMyPayoutRequests = async (req, res) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: {
        userId: req.user.id,
      },
      select: {
        id: true,
      },
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const payouts = await prisma.payoutRequest.findMany({
      where: {
        vendorId: vendor.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      payouts,
    });
  } catch (error) {
    console.error("Get payout requests error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load payout requests",
      error: error.message,
    });
  }
};

 
// export const cancelMyPayout = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const vendor = await prisma.vendor.findUnique({
//       where: {
//         userId: req.user.id,
//       },
//       select: {
//         id: true,
//       },
//     });

//     if (!vendor) {
//       return res.status(404).json({
//         success: false,
//         message: "Vendor not found",
//       });
//     }

//     const payout = await prisma.payoutRequest.findFirst({
//       where: {
//         id,
//         vendorId: vendor.id,
//       },
//     });

//     if (!payout) {
//       return res.status(404).json({
//         success: false,
//         message: "Payout request not found",
//       });
//     }

//     if (payout.status !== "PENDING") {
//       return res.status(400).json({
//         success: false,
//         message: "Only pending payout requests can be cancelled",
//       });
//     }

//     const updatedPayout = await prisma.$transaction(async (tx) => {
//       /*
//        * updateMany condition double refund আটকাবে।
//        */
//       const statusUpdate = await tx.payoutRequest.updateMany({
//         where: {
//           id,
//           vendorId: vendor.id,
//           status: "PENDING",
//         },
//         data: {
//           status: "CANCELLED",
//           cancelledAt: new Date(),
//         },
//       });

//       if (statusUpdate.count !== 1) {
//         const error = new Error(
//           "Payout was already processed or cancelled"
//         );
//         error.statusCode = 400;
//         throw error;
//       }

//       await tx.vendor.update({
//         where: {
//           id: vendor.id,
//         },
//         data: {
//           availableBalance: {
//             increment: payout.amount,
//           },
//         },
//       });
//       await tx.financeTransaction.create({
//         data: {
//           type: "PAYOUT",

//           amount: payout.amount,

//           status: "COMPLETED",

//           referenceId: payout.id,

//           vendorId: payout.vendorId,

//           description:
//             `Vendor payout completed. Transaction ID: ${transactionId.trim()}`,
//         },
//       });

//       return tx.payoutRequest.findUnique({
//         where: {
//           id,
//         },
//       });
//     });

//     await createActivityLog({
//       userId: req.user.id,
//       action: "PAYOUT_CANCELLED",
//       entityType: "PAYOUT",
//       entityId: updatedPayout.id,
//       oldData: {
//         status: payout.status,
//       },
//       newData: {
//         status: updatedPayout.status,
//         amount: updatedPayout.amount,
//       },
//       req,
//     });

//     return res.status(200).json({
//       success: true,
//       message:
//         "Payout cancelled and amount returned to available balance",
//       payout: updatedPayout,
//     });
//   } catch (error) {
//     console.error("Cancel payout error:", error);

//     return res.status(error.statusCode || 400).json({
//       success: false,
//       message: error.message || "Failed to cancel payout",
//     });
//   }
// };
export const cancelMyPayout = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await prisma.vendor.findUnique({
      where: {
        userId: req.user.id,
      },
      select: {
        id: true,
        shopName: true,
        availableBalance: true,
      },
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const payout = await prisma.payoutRequest.findFirst({
      where: {
        id,
        vendorId: vendor.id,
      },
    });

    if (!payout) {
      return res.status(404).json({
        success: false,
        message: "Payout request not found",
      });
    }

    if (payout.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Only pending payout requests can be cancelled",
      });
    }

    const previousBalance = roundMoney(
      vendor.availableBalance
    );

    const result = await prisma.$transaction(async (tx) => {
      const statusUpdate =
        await tx.payoutRequest.updateMany({
          where: {
            id,
            vendorId: vendor.id,
            status: "PENDING",
          },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
          },
        });

      if (statusUpdate.count !== 1) {
        const error = new Error(
          "Payout was already processed or cancelled"
        );

        error.statusCode = 400;
        throw error;
      }

      const updatedVendor = await tx.vendor.update({
        where: {
          id: vendor.id,
        },
        data: {
          availableBalance: {
            increment: payout.amount,
          },
        },
        select: {
          availableBalance: true,
        },
      });

      const updatedPayout =
        await tx.payoutRequest.findUnique({
          where: {
            id,
          },
        });

      return {
        payout: updatedPayout,
        newBalance: roundMoney(
          updatedVendor.availableBalance
        ),
      };
    });

    await createActivityLog({
      userId: req.user.id,

      action: "PAYOUT_CANCELLED",

      module: "PAYOUT",
      entityType: "PAYOUT",
      entityId: result.payout.id,

      targetName:
        vendor.shopName || result.payout.id,

      status: "SUCCESS",

      description: `Payout cancelled and ৳${payout.amount} returned to vendor balance`,

      oldData: {
        balance: previousBalance,
        status: payout.status,
      },

      newData: {
        balance: result.newBalance,
        refundedAmount: payout.amount,
        status: result.payout.status,
      },

      req,
    });

    return res.status(200).json({
      success: true,
      message:
        "Payout cancelled and amount returned to available balance",
      payout: result.payout,
      availableBalance: result.newBalance,
    });
  } catch (error) {
    console.error("Cancel payout error:", error);

    return res.status(error.statusCode || 400).json({
      success: false,
      message:
        error.message || "Failed to cancel payout",
    });
  }
};
 
export const getAdminPayoutSummary = async (req, res) => {
  try {
    const [payoutGroups, vendorTotals, earningTotals] =
      await Promise.all([
        prisma.payoutRequest.groupBy({
          by: ["status"],
          _sum: {
            amount: true,
          },
          _count: {
            id: true,
          },
        }),

        prisma.vendor.aggregate({
          _sum: {
            availableBalance: true,
            totalWithdrawn: true,
          },
        }),

        prisma.orderItem.aggregate({
          where: {
            itemStatus: "COMPLETED",
          },
          _sum: {
            vendorEarning: true,
            platformEarning: true,
            commissionAmount: true,
          },
        }),
      ]);

    const grouped = payoutGroups.reduce((result, item) => {
      result[item.status] = {
        amount: roundMoney(item._sum.amount || 0),
        count: item._count.id || 0,
      };

      return result;
    }, {});

    return res.status(200).json({
      success: true,
      summary: {
        totalVendorEarning: roundMoney(
          earningTotals._sum.vendorEarning || 0
        ),

        totalPlatformEarning: roundMoney(
          earningTotals._sum.platformEarning || 0
        ),

        totalCommission: roundMoney(
          earningTotals._sum.commissionAmount || 0
        ),

        totalVendorAvailableBalance: roundMoney(
          vendorTotals._sum.availableBalance || 0
        ),

        totalWithdrawn: roundMoney(
          vendorTotals._sum.totalWithdrawn || 0
        ),

        pendingPayout: grouped.PENDING || {
          amount: 0,
          count: 0,
        },

        approvedPayout: grouped.APPROVED || {
          amount: 0,
          count: 0,
        },

        paidPayout: grouped.PAID || {
          amount: 0,
          count: 0,
        },

        rejectedPayout: grouped.REJECTED || {
          amount: 0,
          count: 0,
        },

        cancelledPayout: grouped.CANCELLED || {
          amount: 0,
          count: 0,
        },
      },
    });
  } catch (error) {
    console.error("Admin payout summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load finance summary",
      error: error.message,
    });
  }
};

 
export const getAllPayoutRequests = async (req, res) => {
  try {
    const {
      status,
      search,
      vendorId,
      paymentMethod,
      dateFrom,
      dateTo,
      page = 1,
      limit = 10,
    } = req.query;

    const currentPage = Math.max(Number(page) || 1, 1);
    const perPage = Math.min(
      Math.max(Number(limit) || 10, 1),
      100
    );

    const skip = (currentPage - 1) * perPage;

    /*
     * ==========================================
     * BUILD PAYOUT FILTER
     * ==========================================
     */

    const where = {};

    // STATUS
    if (status && status !== "ALL") {
      where.status = status;
    }

    // VENDOR
    if (vendorId && vendorId !== "ALL") {
      where.vendorId = vendorId;
    }

    // PAYMENT METHOD
    if (paymentMethod && paymentMethod !== "ALL") {
      where.paymentMethod = paymentMethod;
    }

    // DATE RANGE
    if (dateFrom || dateTo) {
      where.createdAt = {};

      if (dateFrom) {
        where.createdAt.gte = new Date(`${dateFrom}T00:00:00`);
      }

      if (dateTo) {
        where.createdAt.lte = new Date(`${dateTo}T23:59:59.999`);
      }
    }

    /*
     * ==========================================
     * SEARCH
     *
     * Search করবে:
     * 1. Payout Request ID
     * 2. Account Number
     * 3. Transaction ID
     * 4. Vendor Shop Name
     * 5. Vendor Name
     * 6. Vendor Email
     * ==========================================
     */

    if (search?.trim()) {
      const keyword = search.trim();

      where.OR = [
        {
          id: {
            contains: keyword,
            mode: "insensitive",
          },
        },
        {
          accountNumber: {
            contains: keyword,
            mode: "insensitive",
          },
        },
        {
          transactionId: {
            contains: keyword,
            mode: "insensitive",
          },
        },
        {
          vendor: {
            shopName: {
              contains: keyword,
              mode: "insensitive",
            },
          },
        },
        {
          vendor: {
            user: {
              name: {
                contains: keyword,
                mode: "insensitive",
              },
            },
          },
        },
        {
          vendor: {
            user: {
              email: {
                contains: keyword,
                mode: "insensitive",
              },
            },
          },
        },
      ];
    }

    /*
     * ==========================================
     * GET PAGINATED PAYOUTS
     * ==========================================
     */

    const [payouts, total] = await Promise.all([
      prisma.payoutRequest.findMany({
        where,

        include: {
          vendor: {
            select: {
              id: true,
              shopName: true,
              shopLogo: true,
              availableBalance: true,
              totalWithdrawn: true,

              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },

        skip,
        take: perPage,
      }),

      prisma.payoutRequest.count({
        where,
      }),
    ]);

    /*
     * ==========================================
     * FILTERED PAYOUT SUMMARY
     * ==========================================
     */

    const payoutGroups = await prisma.payoutRequest.groupBy({
      by: ["status"],

      where,

      _sum: {
        amount: true,
      },

      _count: {
        id: true,
      },
    });

    const grouped = payoutGroups.reduce((result, item) => {
      result[item.status] = {
        amount: roundMoney(item._sum.amount || 0),
        count: item._count.id || 0,
      };

      return result;
    }, {});

    /*
     * ==========================================
     * VENDOR AVAILABLE BALANCE
     *
     * Vendor filter থাকলে selected vendor.
     * না থাকলে সব vendor.
     * ==========================================
     */

    const vendorWhere =
      vendorId && vendorId !== "ALL"
        ? {
            id: vendorId,
          }
        : {};

    const vendorTotals = await prisma.vendor.aggregate({
      where: vendorWhere,

      _sum: {
        availableBalance: true,
      },
    });

    /*
     * ==========================================
     * PLATFORM COMMISSION
     *
     * Selected vendor থাকলে সেই vendor-এর
     * completed order commission.
     *
     * না থাকলে সব vendor.
     * ==========================================
     */

    const commissionWhere = {
      itemStatus: "COMPLETED",

      ...(vendorId && vendorId !== "ALL"
        ? {
            vendorId,
          }
        : {}),

      ...(dateFrom || dateTo
        ? {
            completedAt: {
              ...(dateFrom
                ? {
                    gte: new Date(
                      `${dateFrom}T00:00:00`
                    ),
                  }
                : {}),

              ...(dateTo
                ? {
                    lte: new Date(
                      `${dateTo}T23:59:59.999`
                    ),
                  }
                : {}),
            },
          }
        : {}),
    };

    const commissionTotal =
      await prisma.orderItem.aggregate({
        where: commissionWhere,

        _sum: {
          commissionAmount: true,
        },
      });

    /*
     * ==========================================
     * VENDOR DROPDOWN LIST
     *
     * সব active/approved vendor দেখাবে।
     * Current payout filter দিয়ে vendor list
     * restrict করা হবে না।
     * ==========================================
     */

    const vendors = await prisma.vendor.findMany({
      where: {
        status: "APPROVED",
      },

      select: {
        id: true,
        shopName: true,

        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },

      orderBy: {
        shopName: "asc",
      },
    });

    const totalPages = Math.ceil(
      total / perPage
    );

    return res.status(200).json({
      success: true,

      payouts,

      vendors,

      summary: {
        vendorAvailableBalance: roundMoney(
          vendorTotals._sum.availableBalance || 0
        ),

        pendingPayout: grouped.PENDING || {
          amount: 0,
          count: 0,
        },

        approvedPayout: grouped.APPROVED || {
          amount: 0,
          count: 0,
        },

        paidPayout: grouped.PAID || {
          amount: 0,
          count: 0,
        },

        rejectedPayout: grouped.REJECTED || {
          amount: 0,
          count: 0,
        },

        cancelledPayout: grouped.CANCELLED || {
          amount: 0,
          count: 0,
        },

        platformCommission: roundMoney(
          commissionTotal._sum.commissionAmount || 0
        ),
      },

      pagination: {
        page: currentPage,
        limit: perPage,
        total,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      },
    });
  } catch (error) {
    console.error(
      "Get all payout requests error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load payout requests",
      error: error.message,
    });
  }
};

 
// export const approvePayout = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { adminNote } = req.body;

//     const payout = await prisma.payoutRequest.findUnique({
//       where: {
//         id,
//       },
//       include: {
//         vendor: true,
//       },
//     });

//     if (!payout) {
//       return res.status(404).json({
//         success: false,
//         message: "Payout request not found",
//       });
//     }

//     if (payout.status !== "PENDING") {
//       return res.status(400).json({
//         success: false,
//         message: `Only pending payouts can be approved. Current status: ${payout.status}`,
//       });
//     }

//     const statusUpdate = await prisma.payoutRequest.updateMany({
//       where: {
//         id,
//         status: "PENDING",
//       },
//       data: {
//         status: "APPROVED",
//         approvedAt: new Date(),
//         processedById: req.user.id,
//         adminNote: adminNote?.trim() || null,
//       },
//     });

//     if (statusUpdate.count !== 1) {
//       return res.status(400).json({
//         success: false,
//         message: "Payout was already processed",
//       });
//     }

//     const updatedPayout = await prisma.payoutRequest.findUnique({
//       where: {
//         id,
//       },
//     });

//     await createActivityLog({
//       userId: req.user.id,
//       action: "PAYOUT_APPROVED",
//       entityType: "PAYOUT",
//       entityId: id,
//       oldData: {
//         status: payout.status,
//       },
//       newData: {
//         status: updatedPayout.status,
//         amount: updatedPayout.amount,
//       },
//       req,
//     });

//     await createNotification({
//       userId: payout.vendor.userId,
//       title: "Payout Approved",
//       message: `Your payout request of ৳${payout.amount} has been approved.`,
//       type: "PAYOUT_APPROVED",
//       link: "/dashboard/payouts",
//     });

//     return res.status(200).json({
//       success: true,
//       message: "Payout approved successfully",
//       payout: updatedPayout,
//     });
//   } catch (error) {
//     console.error("Approve payout error:", error);

//     return res.status(400).json({
//       success: false,
//       message: error.message || "Failed to approve payout",
//     });
//   }
// };
export const approvePayout = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;

    const payout = await prisma.payoutRequest.findUnique({
      where: {
        id,
      },
      include: {
        vendor: true,
      },
    });

    if (!payout) {
      return res.status(404).json({
        success: false,
        message: "Payout request not found",
      });
    }

    if (payout.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Only pending payouts can be approved. Current status: ${payout.status}`,
      });
    }

    const currentBalance = roundMoney(
      payout.vendor.availableBalance
    );

    const statusUpdate =
      await prisma.payoutRequest.updateMany({
        where: {
          id,
          status: "PENDING",
        },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          processedById: req.user.id,
          adminNote: adminNote?.trim() || null,
        },
      });

    if (statusUpdate.count !== 1) {
      return res.status(400).json({
        success: false,
        message: "Payout was already processed",
      });
    }

    const updatedPayout =
      await prisma.payoutRequest.findUnique({
        where: {
          id,
        },
      });

    await createActivityLog({
      userId: req.user.id,

      action: "PAYOUT_APPROVED",

      module: "PAYOUT",
      entityType: "PAYOUT",
      entityId: id,

      targetName:
        payout.vendor.shopName || id,

      status: "SUCCESS",

      description: `Payout of ৳${payout.amount} approved`,

      oldData: {
        balance: currentBalance,
        status: payout.status,
      },

      newData: {
        balance: currentBalance,
        payoutAmount: updatedPayout.amount,
        status: updatedPayout.status,
      },

      req,
    });

    await createNotification({
      userId: payout.vendor.userId,
      title: "Payout Approved",
      message: `Your payout request of ৳${payout.amount} has been approved.`,
      type: "PAYOUT_APPROVED",
      link: "/dashboard/payouts",
    });

    return res.status(200).json({
      success: true,
      message: "Payout approved successfully",
      payout: updatedPayout,
    });
  } catch (error) {
    console.error("Approve payout error:", error);

    return res.status(400).json({
      success: false,
      message:
        error.message || "Failed to approve payout",
    });
  }
};
 
// export const rejectPayout = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { rejectionReason, adminNote } = req.body;

//     if (!rejectionReason?.trim()) {
//       return res.status(400).json({
//         success: false,
//         message: "Rejection reason is required",
//       });
//     }

//     const payout = await prisma.payoutRequest.findUnique({
//       where: {
//         id,
//       },
//       include: {
//         vendor: true,
//       },
//     });

//     if (!payout) {
//       return res.status(404).json({
//         success: false,
//         message: "Payout request not found",
//       });
//     }

//     if (!["PENDING", "APPROVED"].includes(payout.status)) {
//       return res.status(400).json({
//         success: false,
//         message: `This payout cannot be rejected. Current status: ${payout.status}`,
//       });
//     }

//     const updatedPayout = await prisma.$transaction(async (tx) => {
//       const statusUpdate = await tx.payoutRequest.updateMany({
//         where: {
//           id,
//           status: {
//             in: ["PENDING", "APPROVED"],
//           },
//         },
//         data: {
//           status: "REJECTED",
//           rejectionReason: rejectionReason.trim(),
//           adminNote: adminNote?.trim() || null,
//           rejectedAt: new Date(),
//           processedById: req.user.id,
//         },
//       });

//       if (statusUpdate.count !== 1) {
//         const error = new Error("Payout was already processed");
//         error.statusCode = 400;
//         throw error;
//       }

//       await tx.vendor.update({
//         where: {
//           id: payout.vendorId,
//         },
//         data: {
//           availableBalance: {
//             increment: payout.amount,
//           },
//         },
//       });

//       return tx.payoutRequest.findUnique({
//         where: {
//           id,
//         },
//       });
//     });

//     await createActivityLog({
//       userId: req.user.id,
//       action: "PAYOUT_REJECTED",
//       entityType: "PAYOUT",
//       entityId: id,
//       oldData: {
//         status: payout.status,
//       },
//       newData: {
//         status: updatedPayout.status,
//         amount: updatedPayout.amount,
//         rejectionReason: updatedPayout.rejectionReason,
//       },
//       req,
//     });

//     await createNotification({
//       userId: payout.vendor.userId,
//       title: "Payout Rejected",
//       message: `Your payout request of ৳${payout.amount} was rejected. The amount has been returned to your available balance.`,
//       type: "PAYOUT_REJECTED",
//       link: "/dashboard/payouts",
//     });

//     return res.status(200).json({
//       success: true,
//       message:
//         "Payout rejected and amount returned to vendor balance",
//       payout: updatedPayout,
//     });
//   } catch (error) {
//     console.error("Reject payout error:", error);

//     return res.status(error.statusCode || 400).json({
//       success: false,
//       message: error.message || "Failed to reject payout",
//     });
//   }
// };
export const rejectPayout = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason, adminNote } = req.body;

    if (!rejectionReason?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const payout = await prisma.payoutRequest.findUnique({
      where: {
        id,
      },
      include: {
        vendor: true,
      },
    });

    if (!payout) {
      return res.status(404).json({
        success: false,
        message: "Payout request not found",
      });
    }

    if (!["PENDING", "APPROVED"].includes(payout.status)) {
      return res.status(400).json({
        success: false,
        message: `This payout cannot be rejected. Current status: ${payout.status}`,
      });
    }

    const previousBalance = roundMoney(
      payout.vendor.availableBalance
    );

    const result = await prisma.$transaction(async (tx) => {
      const statusUpdate =
        await tx.payoutRequest.updateMany({
          where: {
            id,
            status: {
              in: ["PENDING", "APPROVED"],
            },
          },
          data: {
            status: "REJECTED",
            rejectionReason:
              rejectionReason.trim(),
            adminNote:
              adminNote?.trim() || null,
            rejectedAt: new Date(),
            processedById: req.user.id,
          },
        });

      if (statusUpdate.count !== 1) {
        const error = new Error(
          "Payout was already processed"
        );

        error.statusCode = 400;
        throw error;
      }

      const updatedVendor = await tx.vendor.update({
        where: {
          id: payout.vendorId,
        },
        data: {
          availableBalance: {
            increment: payout.amount,
          },
        },
        select: {
          availableBalance: true,
        },
      });

      const updatedPayout =
        await tx.payoutRequest.findUnique({
          where: {
            id,
          },
        });

      return {
        payout: updatedPayout,
        newBalance: roundMoney(
          updatedVendor.availableBalance
        ),
      };
    });

    await createActivityLog({
      userId: req.user.id,

      action: "PAYOUT_REJECTED",

      module: "PAYOUT",
      entityType: "PAYOUT",
      entityId: id,

      targetName:
        payout.vendor.shopName || id,

      status: "SUCCESS",

      description: `Payout rejected and ৳${payout.amount} returned to vendor balance`,

      oldData: {
        balance: previousBalance,
        status: payout.status,
      },

      newData: {
        balance: result.newBalance,
        refundedAmount: payout.amount,
        status: result.payout.status,
        rejectionReason:
          result.payout.rejectionReason,
      },

      req,
    });

    await createNotification({
      userId: payout.vendor.userId,
      title: "Payout Rejected",
      message: `Your payout request of ৳${payout.amount} was rejected. The amount has been returned to your available balance.`,
      type: "PAYOUT_REJECTED",
      link: "/dashboard/payouts",
    });

    return res.status(200).json({
      success: true,
      message:
        "Payout rejected and amount returned to vendor balance",
      payout: result.payout,
      availableBalance: result.newBalance,
    });
  } catch (error) {
    console.error("Reject payout error:", error);

    return res.status(error.statusCode || 400).json({
      success: false,
      message:
        error.message || "Failed to reject payout",
    });
  }
};
 
export const markPayoutAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { transactionId, adminNote } = req.body;

    if (!transactionId?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID is required",
      });
    }

    const payout = await prisma.payoutRequest.findUnique({
      where: {
        id,
      },
      include: {
        vendor: true,
      },
    });

    if (!payout) {
      return res.status(404).json({
        success: false,
        message: "Payout request not found",
      });
    }

    if (payout.status !== "APPROVED") {
      return res.status(400).json({
        success: false,
        message: `Only approved payouts can be marked as paid. Current status: ${payout.status}`,
      });
    }

    const updatedPayout = await prisma.$transaction(async (tx) => {
      const statusUpdate = await tx.payoutRequest.updateMany({
        where: {
          id,
          status: "APPROVED",
        },
        data: {
          status: "PAID",
          paidAt: new Date(),
          transactionId: transactionId.trim(),
          processedById: req.user.id,
          adminNote:
            adminNote?.trim() || payout.adminNote || null,
        },
      });

      if (statusUpdate.count !== 1) {
        const error = new Error(
          "Payout was already processed or paid"
        );
        error.statusCode = 400;
        throw error;
      }

      await tx.vendor.update({
        where: {
          id: payout.vendorId,
        },
        data: {
          totalWithdrawn: {
            increment: payout.amount,
          },
        },
      });

      return tx.payoutRequest.findUnique({
        where: {
          id,
        },
      });
    });

    await createActivityLog({
      userId: req.user.id,
      action: "PAYOUT_PAID",
      entityType: "PAYOUT",
      entityId: id,
      oldData: {
        status: payout.status,
      },
      newData: {
        status: updatedPayout.status,
        amount: updatedPayout.amount,
        transactionId: updatedPayout.transactionId,
      },
      req,
    });

    await createNotification({
      userId: payout.vendor.userId,
      title: "Payout Paid",
      message: `Your payout of ৳${payout.amount} has been paid successfully.`,
      type: "PAYOUT_PAID",
      link: "/dashboard/payouts",
    });

    return res.status(200).json({
      success: true,
      message: "Payout marked as paid successfully",
      payout: updatedPayout,
    });
  } catch (error) {
    console.error("Mark payout paid error:", error);

    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Failed to mark payout as paid",
    });
  }
};