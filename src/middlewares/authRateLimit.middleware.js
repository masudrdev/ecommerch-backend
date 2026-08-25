import rateLimit from "express-rate-limit";

const baseOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({
      success: false,
      message: "Too many requests. Please try again later.",
    }),
};

export const loginLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
});

export const authSensitiveLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 30,
});

export const refreshLimiter = rateLimit({
  ...baseOptions,
  windowMs: 5 * 60 * 1000,
  limit: 60,
});
