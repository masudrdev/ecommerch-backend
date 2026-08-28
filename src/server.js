import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import brandRoutes from "./routes/brand.routes.js";
import productRoutes from "./routes/product.routes.js";
import vendorRoutes from "./routes/vendor.routes.js";
import wishlistRoutes from "./routes/wishlist.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import orderRoutes from "./routes/order.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import activityLogRoutes from "./routes/activityLog.routes.js";
import payoutRoutes from "./routes/payout.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import supportRoutes from "./routes/support.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import addressRoutes from "./routes/address.routes.js";
import financeRoutes from "./routes/finance.routes.js";
import userManagementRoutes from "./routes/userManagement.routes.js";
import pageSettingsRoutes from "./routes/pageSettings.routes.js";
import heroSlideRoutes from "./routes/heroSlide.routes.js";
import siteSettingsRoutes from "./routes/siteSettings.routes.js";
import { startVendorContactChangeCleanup } from "./services/vendorContactCleanup.service.js";


dotenv.config();

const app = express();

if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

const allowedOrigins = (
  process.env.FRONTEND_ORIGINS ||
  process.env.FRONTEND_URL ||
  "http://localhost:3000"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "FriendBazar API Running",
  });
});
app.use("/api/finance", financeRoutes);
app.use("/api/user-management", userManagementRoutes);
app.use("/api/page-settings", pageSettingsRoutes);
app.use("/api/hero-slides", heroSlideRoutes);
app.use("/api/site-settings", siteSettingsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/brands", brandRoutes);

app.use("/api/products", productRoutes);

app.use("/api/vendors", vendorRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api/dashboard", dashboardRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/addresses", addressRoutes);

app.use("/api/reviews", reviewRoutes);

app.use("/api/notifications", notificationRoutes);
app.use("/api/activity-logs", activityLogRoutes);
app.use("/api/support", supportRoutes);

app.use("/api/payouts", payoutRoutes);

app.use((error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    console.error(error);
  }

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});


const PORT = Number(process.env.PORT) || 10000;

app.listen(PORT, "0.0.0.0", () => {
  startVendorContactChangeCleanup();
  console.log(`Server running on 0.0.0.0:${PORT}`);
});




