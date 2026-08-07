import prisma from "../lib/prisma.js";


export const getVendorEarnings = async (req, res) => {
  try {

    const page = Number(req.query.page) || 1;

    const limit = Number(req.query.limit) || 20;

    const skip = (page - 1) * limit;



    const where = {
      itemStatus: "COMPLETED",
    };



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
            availableBalance: true,
            totalWithdrawn: true,
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


      vendors:
        Object.values(vendors),



      items:
        completedItems.map(item=>({

          orderId:
            item.order.orderNumber,


          vendor:
            item.vendor.shopName,


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

    const skip = (page - 1) * limit;


    const where = {
      itemStatus: "COMPLETED",
    };


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
              shopName: true,
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

          createdAt:true,

        },

      });





    const summary =
      allItems.reduce(

        (acc,item)=>{


          const sale =
            Number(item.price || 0) *
            Number(item.quantity || 1);



          acc.totalRevenue += sale;



          const date =
            new Date(item.createdAt);



          const today =
            new Date();



          if(
            date.toDateString() ===
            today.toDateString()
          ){

            acc.todayRevenue += sale;

          }




          if(
            date.getMonth() === today.getMonth()
            &&
            date.getFullYear() === today.getFullYear()
          ){

            acc.monthlyRevenue += sale;

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



      items:
        items.map(item=>({

          orderId:
            item.order.orderNumber,


          customer:
            item.order.customerName,


          vendor:
            item.vendor.shopName,


          product:
            item.product.name,


          saleAmount:
            Number(item.price || 0) *
            Number(item.quantity || 1),


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

    const skip = (page - 1) * limit;


    const where = {
      itemStatus: "COMPLETED",
    };



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
              shopName:true,
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



      items:
        items.map(item=>({

          orderId:
            item.order.orderNumber,


          vendor:
            item.vendor.shopName,


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

    const skip = (page - 1) * limit;



    const total =
      await prisma.payoutRequest.count();



    const payouts =
      await prisma.payoutRequest.findMany({

        skip,

        take: limit,


        include: {

          vendor: {

            select: {

              shopName: true,

            },

          },


        },


        orderBy: {

          createdAt: "desc",

        },


      });





    const allPayouts =
      await prisma.payoutRequest.findMany({

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



      payouts:

        payouts.map(item=>({

          id:item.id,


          vendor:
            item.vendor.shopName,


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