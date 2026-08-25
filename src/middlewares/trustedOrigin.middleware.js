const configuredOrigins = () =>
  (
    process.env.FRONTEND_ORIGINS ||
    process.env.FRONTEND_URL ||
    "http://localhost:3000"
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

export const requireTrustedOrigin = (
  req,
  res,
  next
) => {
  const origin = req.get("origin");

  if (!origin || configuredOrigins().includes(origin)) {
    next();
    return;
  }

  return res.status(403).json({
    success: false,
    message: "Untrusted request origin",
  });
};
