import crypto from "crypto";
import jwt from "jsonwebtoken";

export const signAccessToken = (user) =>
  jwt.sign(
    { id: user.id, role: user.role, tokenType: "access" },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

export const signRefreshToken = (user) =>
  jwt.sign(
    { id: user.id, tokenType: "refresh" },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );

export const hashRefreshToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const sameSiteValue = () => {
  const configured = String(
    process.env.REFRESH_COOKIE_SAME_SITE || ""
  ).toLowerCase();
  if (["lax", "strict", "none"].includes(configured)) {
    return configured;
  }
  return process.env.NODE_ENV === "production" ? "none" : "lax";
};

export const refreshCookieOptions = () => ({
  httpOnly: true,
  secure:
    process.env.NODE_ENV === "production" ||
    sameSiteValue() === "none",
  sameSite: sameSiteValue(),
  path: "/api/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

export const setRefreshCookie = (res, token) => {
  res.cookie("refreshToken", token, refreshCookieOptions());
};

export const clearRefreshCookie = (res) => {
  const { maxAge, ...options } = refreshCookieOptions();
  res.clearCookie("refreshToken", options);
};
