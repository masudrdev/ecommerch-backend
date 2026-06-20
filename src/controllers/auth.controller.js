import bcrypt from "bcryptjs";
import sendVerificationEmail from "../utils/sendVerificationEmail.js";
import prisma from "../lib/prisma.js";
import jwt from "jsonwebtoken";
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
        role: data.role || "CUSTOMER",
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

    console.log("Verification Code:", code);

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

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.emailVerificationCode !== code) {
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
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email already verified",
      });
    }

    const code = generateCode();

    await prisma.user.update({
      where: { email },
      data: {
        emailVerificationCode: code,
        emailVerificationExpires: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
    console.log("Verification Code:", code);
    await sendVerificationEmail({
      email,
      code,
    });

    return res.status(200).json({
      success: true,
      message: "New verification code sent successfully",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
export const login = async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.emailOrUsername },
          { username: data.emailOrUsername },
        ],
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Invalid email/username or password",
      });
    }

    const isPasswordMatch = await bcrypt.compare(data.password, user.password);

    if (!isPasswordMatch) {
      return res.status(400).json({
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


    const accessToken = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      {
        id: user.id,
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );
    await prisma.user.update({
  where: { id: user.id },
  data: { refreshToken },
});

    return res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken,
      refreshToken,
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
      message: error.message,
    });
  }
};
export const forgotPassword = async (req, res) => {
  try {
    const data = forgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const code = generateCode();

    await prisma.user.update({
      where: { email: data.email },
      data: {
        resetPasswordCode: code,
        resetPasswordExpires: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    console.log("Reset Password Code:", code);
    await sendVerificationEmail({
      email: data.email,
      code,
    });

    return res.json({
      success: true,
      message: "Password reset code sent successfully",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
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
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Account is not active",
      });
    }

    const newAccessToken = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    return res.json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Invalid or expired refresh token",
    });
  }
};
export const logout = async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { refreshToken: null },
    });

    res.json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};