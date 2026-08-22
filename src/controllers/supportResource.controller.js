import prisma from "../lib/prisma.js";

const clean = (value) => typeof value === "string" ? value.trim() : "";
const vendorFor = (userId) => prisma.vendor.findUnique({ where: { userId }, select: { id: true } });

export const verifySupportReferences = async (user, refs) => {
  const vendor = user.role === "VENDOR" ? await vendorFor(user.id) : null;
  if (user.role === "VENDOR" && !vendor) throw new Error("Vendor profile not found");
  if (refs.orderId) {
    const item = await prisma.order.findFirst({ where: user.role === "CUSTOMER" ? { id: refs.orderId, userId: user.id } : { id: refs.orderId, items: { some: { vendorId: vendor.id } } }, select: { id: true } });
    if (!item) throw new Error("Selected order is not accessible");
  }
  if (refs.productId) {
    const item = await prisma.product.findFirst({ where: user.role === "VENDOR" ? { id: refs.productId, vendorId: vendor.id } : { id: refs.productId, orderItems: { some: { order: { userId: user.id } } } }, select: { id: true } });
    if (!item) throw new Error("Selected product is not accessible");
  }
  if (refs.paymentTransactionId) {
    const item = await prisma.financeTransaction.findFirst({ where: user.role === "CUSTOMER" ? { id: refs.paymentTransactionId, userId: user.id } : { id: refs.paymentTransactionId, vendorId: vendor.id }, select: { id: true } });
    if (!item) throw new Error("Selected payment transaction is not accessible");
  }
  if (refs.withdrawalId) {
    if (user.role !== "VENDOR") throw new Error("Withdrawals are available to Vendors only");
    const item = await prisma.payoutRequest.findFirst({ where: { id: refs.withdrawalId, vendorId: vendor.id }, select: { id: true } });
    if (!item) throw new Error("Selected withdrawal is not accessible");
  }
};

export const getRelatedResources = async (req, res) => {
  try {
    const type = clean(req.query.type).toLowerCase();
    const search = clean(req.query.search).slice(0, 100);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
    const vendor = req.user.role === "VENDOR" ? await vendorFor(req.user.id) : null;
    if (req.user.role === "VENDOR" && !vendor) return res.status(404).json({ success: false, message: "Vendor profile not found" });
    let model, where, select;
    if (type === "orders") { model=prisma.order; where=req.user.role === "CUSTOMER" ? {userId:req.user.id} : {items:{some:{vendorId:vendor.id}}}; if(search) where.OR=[{orderNumber:{contains:search,mode:"insensitive"}},{id:{contains:search,mode:"insensitive"}}]; select={id:true,orderNumber:true,totalAmount:true,orderStatus:true,paymentStatus:true,createdAt:true}; }
    else if(type === "products") { model=prisma.product; where=req.user.role === "VENDOR" ? {vendorId:vendor.id} : {orderItems:{some:{order:{userId:req.user.id}}}}; if(search) where.OR=[{name:{contains:search,mode:"insensitive"}},{id:{contains:search,mode:"insensitive"}}]; select={id:true,name:true,status:true,price:true,createdAt:true}; }
    else if(type === "payments") { model=prisma.financeTransaction; where=req.user.role === "CUSTOMER" ? {userId:req.user.id} : {vendorId:vendor.id}; if(search) where.OR=[{id:{contains:search,mode:"insensitive"}},{referenceId:{contains:search,mode:"insensitive"}}]; select={id:true,referenceId:true,type:true,amount:true,status:true,createdAt:true}; }
    else if(type === "withdrawals" && req.user.role === "VENDOR") { model=prisma.payoutRequest; where={vendorId:vendor.id}; if(search) where.OR=[{id:{contains:search,mode:"insensitive"}},{transactionId:{contains:search,mode:"insensitive"}}]; select={id:true,transactionId:true,amount:true,status:true,paymentMethod:true,createdAt:true}; }
    else return res.status(400).json({success:false,message:"Invalid related resource type"});
    const [resources,total]=await prisma.$transaction([model.findMany({where,select,orderBy:{createdAt:"desc"},skip:(page-1)*limit,take:limit}),model.count({where})]);
    return res.json({success:true,resources,pagination:{page,limit,total,totalPages:Math.ceil(total/limit)}});
  } catch(error) { return res.status(500).json({success:false,message:error.message||"Failed to load related resources"}); }
};

export const loadRelatedInformation = async (ticket) => {
  const [order,product,payment,withdrawal]=await Promise.all([
    ticket.orderId?prisma.order.findUnique({where:{id:ticket.orderId},select:{id:true,orderNumber:true,totalAmount:true,orderStatus:true,paymentStatus:true,paymentMethod:true,createdAt:true}}):null,
    ticket.productId?prisma.product.findUnique({where:{id:ticket.productId},select:{id:true,name:true,status:true,price:true,createdAt:true}}):null,
    ticket.paymentTransactionId?prisma.financeTransaction.findUnique({where:{id:ticket.paymentTransactionId},select:{id:true,referenceId:true,type:true,amount:true,status:true,createdAt:true}}):null,
    ticket.withdrawalId?prisma.payoutRequest.findUnique({where:{id:ticket.withdrawalId},select:{id:true,transactionId:true,amount:true,status:true,paymentMethod:true,createdAt:true}}):null,
  ]); return {order,product,payment,withdrawal};
};