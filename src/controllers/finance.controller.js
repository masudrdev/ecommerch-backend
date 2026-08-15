import prisma from "../lib/prisma.js";


export const getVendorEarnings = async (req, res) => {
  try {

    const page = Number(req.query.page) || 1;

    const limit = Number(req.query.limit) || 20;

    const search = String(req.query.search || "").trim();

    const vendorId = String(req.query.vendorId || "").trim();

    const skip = (page - 1) * limit;



    const filters = [{ itemStatus: "COMPLETED" }];

    if (vendorId) {
      filters.push({ vendorId });
    }

    if (search) {
      filters.push({
        OR: [
          { order: { orderNumber: { contains: search, mode: "insensitive" } } },
          { order: { customerName: { contains: search, mode: "insensitive" } } },
          { product: { name: { contains: search, mode: "insensitive" } } },
          { vendor: { user: { username: { contains: search, mode: "insensitive" } } } },
        ],
      });
    }

    const where = filters.length === 1 ? filters[0] : { AND: filters };



    const total = await prisma.orderItem.count({
      where,
    });



    const completedItems = await prisma.orderItem.findMany({

      where,

      skip,

      take: limit,


      include: {

        vendor: {
          select: {
            id: true,
            shopName: true,
            user: {
              select: {
                username: true,
              },
            },
          },
        },


        product: {
          select: {
            id: true,
            name: true,
          },
        },


        order: {
          select: {
            orderNumber: true,
            customerName: true,
            paymentStatus: true,
            orderStatus: true,
            createdAt: true,
          },
        },

      },


      orderBy: {
        createdAt: "desc",
      },


    });





    // Summary (all completed earnings)

    const allItems = await prisma.orderItem.findMany({

      where,

      select: {

        price: true,

        quantity: true,

        commissionAmount: true,

        platformEarning: true,

        vendorEarning: true,

      },

    });





    const summary = allItems.reduce(

      (acc, item)=>{


        const sale =
          Number(item.price || 0) *
          Number(item.quantity || 1);



        acc.totalSales += sale;


        acc.totalCommission +=
          Number(item.commissionAmount || 0);



        acc.totalPlatformEarning +=
          Number(item.platformEarning || 0);



        acc.totalVendorEarning +=
          Number(item.vendorEarning || 0);



        acc.totalOrders += 1;



        return acc;


      },


      {

        totalSales:0,

        totalCommission:0,

        totalPlatformEarning:0,

        totalVendorEarning:0,

        totalOrders:0,

      }

    );







    // Vendor summary

    const vendorItems =
      await prisma.orderItem.findMany({

        where,


        include:{

          vendor:{
            select:{
              id:true,
              shopName:true,
            },
          },

        },

      });





    const vendorOptions = await prisma.vendor.findMany({
      select: {
        id: true,
        user: {
          select: {
            username: true,
          },
        },
      },
      orderBy: {
        user: {
          username: "asc",
        },
      },
    });

    const vendors = {};



    vendorItems.forEach((item)=>{


      const id = item.vendorId;



      if(!vendors[id]){


        vendors[id]={

          vendorId:id,

          vendorName:
            item.vendor.shopName,


          totalOrders:0,


          totalSales:0,


          commission:0,


          vendorEarning:0,

        };


      }





      const sale =
        Number(item.price || 0) *
        Number(item.quantity || 1);



      vendors[id].totalOrders += 1;


      vendors[id].totalSales += sale;


      vendors[id].commission +=
        Number(item.commissionAmount || 0);



      vendors[id].vendorEarning +=
        Number(item.vendorEarning || 0);



    });


    res.json({

      success:true,


      pagination:{

        page,

        limit,

        total,

        totalPages:
          Math.ceil(total / limit),

      },



      summary,


      vendors: vendorOptions.map((vendor) => ({
        id: vendor.id,
        username: vendor.user.username,
      })),



      items:
        completedItems.map(item=>({

          orderId:
            item.order.orderNumber,


          customer:
            item.order.customerName,


          vendorUsername:
            item.vendor.user.username,


          product:
            item.product.name,


          salePrice:
            Number(item.price || 0) *
            Number(item.quantity || 1),



          commission:
            item.commissionAmount || 0,



          platformEarning:
            item.platformEarning || 0,



          vendorEarning:
            item.vendorEarning || 0,


          paymentStatus:
            item.order.paymentStatus,


          orderStatus:
            item.order.orderStatus,



          status:
            item.itemStatus,



          date:
            item.createdAt,


        })),


    });



  } catch(error){


    console.error(
      "Vendor earnings error:",
      error
    );



    res.status(500).json({

      success:false,

      message:
        "Failed to load vendor earnings",

    });


  }
};
export const getRevenue = async (req, res) => {
  try {

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = String(req.query.search || "").trim();
    const vendorId = String(req.query.vendorId || "").trim();

    const skip = (page - 1) * limit;

    const filters = [{ itemStatus: "COMPLETED" }];

    if (vendorId) {
      filters.push({ vendorId });
    }

    if (search) {
      filters.push({
        OR: [
          {
            order: {
              orderNumber: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
          {
            order: {
              customerName: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
          {
            product: {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
          {
            vendor: {
              user: {
                username: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
          },
        ],
      });
    }

    const where =
      filters.length === 1
        ? filters[0]
        : { AND: filters };


    const total =
      await prisma.orderItem.count({
        where,
      });



    const items =
      await prisma.orderItem.findMany({

        where,

        skip,

        take: limit,


        include: {

          vendor: {
            select: {
              id: true,
              user: {
                select: {
                  username: true,
                },
              },
            },
          },


          product: {
            select: {
              name: true,
            },
          },


          order: {
            select: {
              orderNumber: true,
              customerName: true,
              paymentStatus: true,
              orderStatus: true,
              createdAt: true,
            },
          },

        },


        orderBy: {
          createdAt: "desc",
        },


      });





    const allItems =
      await prisma.orderItem.findMany({

        where,

        select: {

          price:true,

          quantity:true,

          commissionAmount:true,

          createdAt:true,

        },

      });





    const summary =
      allItems.reduce(

        (acc,item)=>{


          const saleAmount =
            Number(item.price || 0) *
            Number(item.quantity || 1);

          const revenueAmount =
            saleAmount -
            Number(item.commissionAmount || 0);



          acc.totalRevenue += revenueAmount;



          const date =
            new Date(item.createdAt);



          const today =
            new Date();



          if(
            date.toDateString() ===
            today.toDateString()
          ){

            acc.todayRevenue += revenueAmount;

          }




          if(
            date.getMonth() === today.getMonth()
            &&
            date.getFullYear() === today.getFullYear()
          ){

            acc.monthlyRevenue += revenueAmount;

          }



          acc.completedOrders += 1;



          return acc;


        },


        {

          totalRevenue:0,

          todayRevenue:0,

          monthlyRevenue:0,

          completedOrders:0,

        }

      );

    const vendors = await prisma.vendor.findMany({
      where: {
        orders: {
          some: {
            itemStatus: "COMPLETED",
          },
        },
      },
      select: {
        id: true,
        user: {
          select: {
            username: true,
          },
        },
      },
      orderBy: {
        user: {
          username: "asc",
        },
      },
    });







    res.json({

      success:true,


      pagination:{

        page,

        limit,

        total,

        totalPages:
          Math.ceil(total / limit),

      },


      summary,

      vendors: vendors.map((vendor) => ({
        id: vendor.id,
        username: vendor.user.username,
      })),



      items:
        items.map(item=>{

          const saleAmount =
            Number(item.price || 0) *
            Number(item.quantity || 1);

          const platformCommission =
            Number(item.commissionAmount || 0);

          return {

          orderId:
            item.order.orderNumber,


          customer:
            item.order.customerName,


          vendorUsername:
            item.vendor.user.username,


          product:
            item.product.name,


          saleAmount,

          platformCommission,

          revenueAmount:
            saleAmount - platformCommission,


          paymentStatus:
            item.order.paymentStatus,


          orderStatus:
            item.order.orderStatus,


          date:
            item.createdAt,

        };

        }),


    });



  } catch(error){


    console.error(
      "Revenue error:",
      error
    );


    res.status(500).json({

      success:false,

      message:
        "Failed to load revenue",

    });


  }
};
export const getCommission = async (req, res) => {
  try {

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = String(req.query.search || "").trim();
    const vendorId = String(req.query.vendorId || "").trim();

    const skip = (page - 1) * limit;

    const filters = [{ itemStatus: "COMPLETED" }];

    if (vendorId) {
      filters.push({ vendorId });
    }

    if (search) {
      filters.push({
        OR: [
          { order: { orderNumber: { contains: search, mode: "insensitive" } } },
          { order: { customerName: { contains: search, mode: "insensitive" } } },
          { product: { name: { contains: search, mode: "insensitive" } } },
          { vendor: { user: { username: { contains: search, mode: "insensitive" } } } },
        ],
      });
    }

    const where = filters.length === 1 ? filters[0] : { AND: filters };

    const vendors = await prisma.vendor.findMany({
      select: {
        id: true,
        user: {
          select: {
            username: true,
          },
        },
      },
      orderBy: {
        user: {
          username: "asc",
        },
      },
    });



    const total =
      await prisma.orderItem.count({
        where,
      });




    const items =
      await prisma.orderItem.findMany({

        where,

        skip,

        take: limit,


        include: {

          vendor:{
            select:{
              user:{
                select:{
                  username:true,
                },
              },
            },
          },


          product:{
            select:{
              name:true,
            },
          },


          order:{
            select:{
              orderNumber:true,
              customerName:true,
              paymentStatus:true,
              orderStatus:true,
              createdAt:true,
            },
          },


        },


        orderBy:{
          createdAt:"desc",
        },


      });






    const allItems =
      await prisma.orderItem.findMany({

        where,

        select:{

          commissionAmount:true,

          platformEarning:true,

          createdAt:true,

        },

      });






    const summary =
      allItems.reduce(
        (acc,item)=>{


          const commission =
            Number(item.commissionAmount || 0);



          acc.totalCommission += commission;



          const date =
            new Date(item.createdAt);


          const today =
            new Date();



          if(
            date.toDateString()
            ===
            today.toDateString()
          ){

            acc.todayCommission += commission;

          }




          if(
            date.getMonth()
            ===
            today.getMonth()
            &&
            date.getFullYear()
            ===
            today.getFullYear()
          ){

            acc.monthlyCommission += commission;

          }



          acc.completedOrders +=1;


          return acc;


        },


        {

          totalCommission:0,

          todayCommission:0,

          monthlyCommission:0,

          completedOrders:0,

        }

      );








    res.json({

      success:true,


      pagination:{

        page,

        limit,

        total,

        totalPages:
          Math.ceil(total / limit),

      },


      summary,



      vendors: vendors.map((vendor) => ({
        id: vendor.id,
        username: vendor.user.username,
      })),


      items:
        items.map(item=>({

          orderId:
            item.order.orderNumber,


          customer:
            item.order.customerName,


          vendorUsername:
            item.vendor.user.username,


          product:
            item.product.name,


          saleAmount:
            Number(item.price || 0) *
            Number(item.quantity || 1),



          commissionType:
            item.commissionType,


          commissionValue:
            item.commissionValue || 0,



          commission:
            item.commissionAmount || 0,



          platformEarning:
            item.platformEarning || 0,


          paymentStatus:
            item.order.paymentStatus,


          orderStatus:
            item.order.orderStatus,



          date:
            item.createdAt,

        })),


    });



  } catch(error){

    console.error(
      "Commission error:",
      error
    );


    res.status(500).json({

      success:false,

      message:"Failed to load commission",

    });


  }
};
export const getPayoutReports = async (req, res) => {
  try {

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = String(req.query.search || "").trim();
    const vendorId = String(req.query.vendorId || "").trim();

    const skip = (page - 1) * limit;

    const filters = [];

    if (vendorId) {
      filters.push({ vendorId });
    }

    if (search) {
      filters.push({
        OR: [
          { id: { contains: search, mode: "insensitive" } },
          { transactionId: { contains: search, mode: "insensitive" } },
          { vendor: { user: { username: { contains: search, mode: "insensitive" } } } },
        ],
      });
    }

    const where = filters.length ? { AND: filters } : {};

    const total =
      await prisma.payoutRequest.count({ where });



    const payouts =
      await prisma.payoutRequest.findMany({

        where,

        skip,

        take: limit,


        include: {

          vendor: {

            select: {

              user: {
                select: {
                  username: true,
                },
              },

            },

          },


        },


        orderBy: {

          createdAt: "desc",

        },


      });





    const allPayouts =
      await prisma.payoutRequest.findMany({

        where,

        select: {

          amount:true,

          status:true,

        },

      });






    const summary =
      allPayouts.reduce(

        (acc,payout)=>{


          const amount =
            Number(payout.amount || 0);



          acc.totalRequested += amount;



          if(
            payout.status === "PENDING"
          ){

            acc.pendingAmount += amount;

          }



          if(
            payout.status === "APPROVED"
          ){

            acc.approvedAmount += amount;

          }



          if(
            payout.status === "PAID"
          ){

            acc.paidAmount += amount;

          }



          if(
            payout.status === "REJECTED"
          ){

            acc.rejectedAmount += amount;

          }



          if(
            payout.status === "CANCELLED"
          ){

            acc.cancelledAmount += amount;

          }



          return acc;


        },

        {

          totalRequested:0,

          pendingAmount:0,

          approvedAmount:0,

          paidAmount:0,

          rejectedAmount:0,

          cancelledAmount:0,

        }

      );







    const vendors = await prisma.vendor.findMany({
      select: {
        id: true,
        user: {
          select: {
            username: true,
          },
        },
      },
      orderBy: {
        user: {
          username: "asc",
        },
      },
    });

    res.json({

      success:true,


      pagination:{

        page,

        limit,

        total,

        totalPages:
          Math.ceil(total / limit),

      },



      summary,


      vendors: vendors.map((vendor) => ({
        id: vendor.id,
        username: vendor.user.username,
      })),



      payouts:

        payouts.map(item=>({

          id:item.id,


          vendorUsername:
            item.vendor.user.username,


          amount:
            item.amount,


          paymentMethod:
            item.paymentMethod,


          status:
            item.status,


          transactionId:
            item.transactionId,


          approvedAt:
            item.approvedAt,


          paidAt:
            item.paidAt,


          rejectedAt:
            item.rejectedAt,


          cancelledAt:
            item.cancelledAt,


          createdAt:
            item.createdAt,


        })),


    });





  } catch(error){


    console.error(
      "Payout reports error:",
      error
    );


    res.status(500).json({

      success:false,

      message:
        "Failed to load payout reports",

    });


  }
};
export const getTransactions = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const search = String(req.query.search || "").trim();
    const vendorId = String(req.query.vendorId || "").trim();
    const type = String(req.query.type || "").trim().toUpperCase();
    const skip = (page - 1) * limit;

    const itemFilters = [{ itemStatus: { not: "CANCELLED" } }];

    if (vendorId) itemFilters.push({ vendorId });
    if (type === "COMPLETE") itemFilters.push({ itemStatus: "COMPLETED" });
    if (type === "UNCOMPLETE") itemFilters.push({ itemStatus: { notIn: ["COMPLETED", "CANCELLED"] } });
    if (search) {
      itemFilters.push({
        OR: [
          { order: { orderNumber: { contains: search, mode: "insensitive" } } },
          { order: { customerName: { contains: search, mode: "insensitive" } } },
          { product: { name: { contains: search, mode: "insensitive" } } },
          { vendor: { user: { username: { contains: search, mode: "insensitive" } } } },
        ],
      });
    }

    const where = itemFilters.length === 1 ? itemFilters[0] : { AND: itemFilters };
    const [total, orderItems, allItems, vendors] = await Promise.all([
      prisma.orderItem.count({ where }),
      prisma.orderItem.findMany({
        where,
        skip,
        take: limit,
        include: {
          vendor: { select: { user: { select: { username: true } } } },
          product: { select: { name: true } },
          order: { select: { id: true, orderNumber: true, customerName: true, paymentStatus: true, orderStatus: true, createdAt: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.orderItem.findMany({
        where,
        select: { price: true, quantity: true, itemStatus: true, commissionAmount: true, vendorEarning: true },
      }),
      prisma.vendor.findMany({
        select: { id: true, user: { select: { username: true } } },
        orderBy: { user: { username: "asc" } },
      }),
    ]);

    const summary = allItems.reduce((acc, item) => {
      const saleAmount = Number(item.price || 0) * Number(item.quantity || 1);
      acc.totalAmount += saleAmount;
      acc.totalTransactions += 1;
      if (item.itemStatus === "COMPLETED") {
        acc.commission += Number(item.commissionAmount || 0);
        acc.vendorEarnings += Number(item.vendorEarning || 0);
      }
      return acc;
    }, { totalTransactions: 0, totalAmount: 0, commission: 0, vendorEarnings: 0 });

    return res.json({
      success: true,
      pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
      summary,
      vendors: vendors.map((vendor) => ({ id: vendor.id, username: vendor.user.username })),
      transactions: orderItems.map((item) => ({
        id: item.id,
        orderId: item.order.id,
        orderNumber: item.order.orderNumber,
        customer: item.order.customerName,
        vendorUsername: item.vendor.user.username,
        product: item.product.name,
        amount: Number(item.price || 0) * Number(item.quantity || 1),
        commission: Number(item.commissionAmount || 0),
        vendorEarning: Number(item.vendorEarning || 0),
        paymentStatus: item.order.paymentStatus,
        orderStatus: item.itemStatus,
        date: item.createdAt,
      })),
    });


  } catch(error){

    console.error(
      "Transactions error:",
      error
    );


    return res.status(500).json({

      success:false,

      message:
        "Failed to load transactions",

    });

  }
};
