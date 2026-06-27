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
const router = express.Router();

router.post("/register", register);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification-code", resendVerificationCode);
router.post("/login", login);
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
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOtp);
router.post("/reset-password", resetPassword);

router.patch("/profile", protect, updateMyProfile);
router.patch("/update-password", protect, updatePassword);
router.post("/refresh-token", refreshToken);
router.post("/logout", protect, logout);

export default router;