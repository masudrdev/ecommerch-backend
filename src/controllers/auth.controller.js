import bcrypt from "bcryptjs";
import sendVerificationEmail from "../utils/sendVerificationEmail.js";
import prisma from "../lib/prisma.js";
import jwt from "jsonwebtoken";
import {
  clearRefreshCookie,
  hashRefreshToken,
  setRefreshCookie,
  signAccessToken,
  signRefreshToken,
} from "../utils/authTokens.js";
import generateCode from "../utils/generateCode.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyResetOtpSchema,
  resetPasswordSchema,
  updatePasswordSchema,
} from "../validations/auth.validation.js";

export const register = async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const code = generateCode();

    const user = await prisma.user.create({
      data: {
        name: data.name,
        username: data.username,
        email: data.email,
        password: hashedPassword,
        role: "CUSTOMER",
        isEmailVerified: false,
        emailVerificationCode: code,
        emailVerificationExpires: new Date(Date.now() + 10 * 60 * 1000),
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        isEmailVerified: true,
      },
    });

    await sendVerificationEmail({
      email: data.email,
      code,
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful. Verification code sent.",
      user,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
export const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user || user.emailVerificationCode !== code) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code",
      });
    }

    if (new Date() > user.emailVerificationExpires) {
      return res.status(400).json({
        success: false,
        message: "Verification code expired",
      });
    }

    await prisma.user.update({
      where: { email },
      data: {
        isEmailVerified: true,
        emailVerificationCode: null,
        emailVerificationExpires: null,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const resendVerificationCode = async (req, res) => {
  const genericResponse = {
    success: true,
    message:
      "If the account is eligible, a new verification code has been sent.",
  };

  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const user = email
      ? await prisma.user.findUnique({ where: { email } })
      : null;

    if (user && !user.isEmailVerified) {
      const code = generateCode();
      await prisma.user.update({
        where: { email },
        data: {
          emailVerificationCode: code,
          emailVerificationExpires: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      try {
        await sendVerificationEmail({ email, code });
      } catch (error) {
        console.error(
          "Verification email delivery failed:",
          error?.message || "Unknown mail error"
        );
      }
    }

    return res.status(200).json(genericResponse);
  } catch {
    return res.status(200).json(genericResponse);
  }
};
export const login = async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
    const identifier = data.emailOrUsername.trim();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { username: identifier },
        ],
      },
    });

    const isPasswordMatch = user
      ? await bcrypt.compare(data.password, user.password)
      : false;

    if (!user || !isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email/username or password",
      });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before login",
      });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Your account is not active",
      });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: hashRefreshToken(refreshToken),
      },
    });

    setRefreshCookie(res, refreshToken);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        process.env.NODE_ENV === "production"
          ? "Login failed"
          : error.message,
    });
  }
};
export const forgotPassword = async (req, res) => {
  const genericResponse = {
    success: true,
    message:
      "If an account exists for this email, a password reset code has been sent.",
  };

  try {
    const data = forgotPasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (user) {
      const code = generateCode();
      await prisma.user.update({
        where: { email: data.email },
        data: {
          resetPasswordCode: code,
          resetPasswordExpires: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      try {
        await sendVerificationEmail({ email: data.email, code });
      } catch (error) {
        console.error(
          "Password reset email delivery failed:",
          error?.message || "Unknown mail error"
        );
      }
    }

    return res.status(200).json(genericResponse);
  } catch (error) {
    if (error?.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Valid email is required",
      });
    }

    return res.status(200).json(genericResponse);
  }
};
export const verifyResetOtp = async (req, res) => {
  try {
    const data = verifyResetOtpSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user || user.resetPasswordCode !== data.code) {
      return res.status(400).json({
        success: false,
        message: "Invalid reset code",
      });
    }

    if (new Date() > user.resetPasswordExpires) {
      return res.status(400).json({
        success: false,
        message: "Reset code expired",
      });
    }

    return res.json({
      success: true,
      message: "Reset code verified successfully",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
export const resetPassword = async (req, res) => {
  try {
    const data = resetPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user || user.resetPasswordCode !== data.code) {
      return res.status(400).json({
        success: false,
        message: "Invalid reset code",
      });
    }

    if (new Date() > user.resetPasswordExpires) {
      return res.status(400).json({
        success: false,
        message: "Reset code expired",
      });
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, 10);

    await prisma.user.update({
      where: { email: data.email },
      data: {
        password: hashedPassword,
        resetPasswordCode: null,
        resetPasswordExpires: null,
      },
    });

    return res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
export const updatePassword = async (req, res) => {
  try {
    const data = updatePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    const isMatch = await bcrypt.compare(data.oldPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Old password is incorrect",
      });
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, 10);

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        password: hashedPassword,
      },
    });

    return res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
export const refreshToken = async (req, res) => {
  try {
    const token =
      req.cookies?.refreshToken ||
      req.body?.refreshToken;

    if (!token) {
      clearRefreshCookie(res);
      return res.status(401).json({
        success: false,
        message: "Refresh session is required",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET
    );

    if (
      decoded.tokenType &&
      decoded.tokenType !== "refresh"
    ) {
      throw new Error("Invalid token purpose");
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    const storedTokenMatches =
      user &&
      (user.refreshToken === hashRefreshToken(token) ||
        user.refreshToken === token);

    if (
      !user ||
      !storedTokenMatches ||
      user.status !== "ACTIVE"
    ) {
      clearRefreshCookie(res);
      return res.status(403).json({
        success: false,
        message: "Invalid refresh session",
      });
    }

    const newRefreshToken = signRefreshToken(user);
    const newAccessToken = signAccessToken(user);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken:
          hashRefreshToken(newRefreshToken),
      },
    });

    setRefreshCookie(res, newRefreshToken);

    return res.json({
      success: true,
      accessToken: newAccessToken,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch {
    clearRefreshCookie(res);
    return res.status(403).json({
      success: false,
      message: "Invalid or expired refresh session",
    });
  }
};

export const logout = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    let userId = req.user?.id;

    if (!userId && token) {
      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_REFRESH_SECRET
        );
        userId = decoded.id;
      } catch {
        userId = null;
      }
    }

    if (userId) {
      await prisma.user.updateMany({
        where: { id: userId },
        data: { refreshToken: null },
      });
    }

    clearRefreshCookie(res);

    return res.json({
      success: true,
      message: "Logout successful",
    });
  } catch {
    clearRefreshCookie(res);
    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  }
};
export const updateMyProfile = async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name,
        phone,
        avatar,
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        avatar: true,
        role: true,
        status: true,
      },
    });

    res.json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};



