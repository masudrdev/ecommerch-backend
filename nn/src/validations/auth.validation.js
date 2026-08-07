import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can contain letters, numbers and underscore only"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  
});
export const loginSchema = z.object({
  emailOrUsername: z.string().min(1, "Email or username is required"),
  password: z.string().min(6, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Valid email is required"),
});

export const verifyResetOtpSchema = z.object({
  email: z.string().email("Valid email is required"),
  code: z.string().min(6, "Code is required"),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Valid email is required"),
  code: z.string().min(6, "Code is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

export const updatePasswordSchema = z.object({
  oldPassword: z.string().min(6, "Old password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});