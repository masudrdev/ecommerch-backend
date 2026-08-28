export const normalizePhone = (value) => {
  if (value == null || String(value).trim() === "") return null;
  let digits = String(value).replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length < 6 || digits.length > 15) {
    throw new Error("Valid phone number is required");
  }
  if (digits.startsWith("880")) return `+${digits}`;
  if (/^01\d{9}$/.test(digits)) return `+88${digits}`;
  if (/^1\d{9}$/.test(digits)) return `+880${digits}`;
  return `+${digits}`;
};

export const isPhoneUniqueError = (error) =>
  error?.code === "P2002" &&
  (Array.isArray(error?.meta?.target)
    ? error.meta.target.includes("phone")
    : String(error?.meta?.target || "").toLowerCase().includes("phone"));