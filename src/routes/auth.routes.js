import express from "express";
import {
  register,
  verifyEmail,
  login,
  resendVerificationCode,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  updatePassword,
  refreshToken,
  logout,
  updateMyProfile,
} from "../controllers/auth.controller.js";
import { protect, allowRoles } from "../middlewares/auth.middleware.js";
import { requireTrustedOrigin } from "../middlewares/trustedOrigin.middleware.js";
import {
  authSensitiveLimiter,
  loginLimiter,
  refreshLimiter,
} from "../middlewares/authRateLimit.middleware.js";
const router = express.Router();

router.post("/register", authSensitiveLimiter, register);
router.post("/verify-email", authSensitiveLimiter, verifyEmail);
router.post("/resend-verification-code", authSensitiveLimiter, resendVerificationCode);
router.post("/login", loginLimiter, login);
router.get("/me", protect, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

router.get("/admin-test", protect, allowRoles("ADMIN", "SUPER_ADMIN"),
  (req, res) => {
    res.json({
      success: true,
      message: "Admin access granted",
    });
  }
);
router.post("/forgot-password", authSensitiveLimiter, forgotPassword);
router.post("/verify-reset-otp", authSensitiveLimiter, verifyResetOtp);
router.post("/reset-password", authSensitiveLimiter, resetPassword);

router.patch("/profile", protect, updateMyProfile);
router.patch("/update-password", protect, updatePassword);
router.post("/refresh-token", requireTrustedOrigin, refreshLimiter, refreshToken);
router.post("/logout", requireTrustedOrigin, logout);

export default router;

