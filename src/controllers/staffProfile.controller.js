import crypto from "crypto";
import prisma from "../lib/prisma.js";
import uploadToCloudinary from "../utils/uploadToCloudinary.js";
import { isPhoneUniqueError, normalizePhone } from "../utils/phone.js";
import sendStaffContactChangeEmail from "../utils/sendStaffContactChangeEmail.js";
import { scheduleStaffContactChangeCleanup } from "../services/staffContactChangeCleanup.service.js";
import {
  CONTACT_CODE_TTL_MS as CODE_TTL_MS,
  CONTACT_CODE_RESEND_MS as RESEND_COOLDOWN_MS,
  CONTACT_CODE_MAX_ATTEMPTS as MAX_ATTEMPTS,
  createContactChangeCode,
} from "../utils/contactChangeVerification.js";

const AUTHORIZATION_TTL_MS = 5 * 60 * 1000;
const PURPOSES = new Set(["EMAIL_CHANGE", "PHONE_CHANGE"]);
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const safeEqual = (left, right) => {
  const a = Buffer.from(left || "", "hex");
  const b = Buffer.from(right || "", "hex");
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
};
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isRealImage = (file) => {
  const bytes = file?.buffer;
  if (!bytes || bytes.length < 12) return false;
  if (file.mimetype === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.mimetype === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (file.mimetype === "image/webp") return bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
  return false;
};
const profileSelect = { id: true, name: true, username: true, email: true, phone: true, avatar: true, role: true, status: true, createdAt: true };

export const getMyStaffProfile = async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: profileSelect });
  if (!user) return res.status(404).json({ success: false, message: "Profile not found" });
  return res.json({ success: true, user });
};

export const updateMyStaffProfile = async (req, res) => {
  let uploaded;
  try {
    const unexpected = Object.keys(req.body || {}).filter((key) => key !== "name");
    if (unexpected.length) return res.status(400).json({ success: false, message: "Only name and avatar can be updated here" });
    const name = String(req.body?.name || "").trim();
    if (name.length < 2 || name.length > 100) return res.status(400).json({ success: false, message: "Valid name is required" });
    if (req.file) {
      if (!isRealImage(req.file)) return res.status(400).json({ success: false, message: "Please upload a valid JPG, PNG, or WebP image" });
      uploaded = await uploadToCloudinary(req.file.buffer, "friendbazar/staff-avatars");
    }
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, ...(uploaded ? { avatar: uploaded.secure_url } : {}) },
      select: profileSelect,
    });
    return res.json({ success: true, message: "Profile updated successfully", user });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.error("Staff profile update failed:", error?.message);
    return res.status(500).json({ success: false, message: "Unable to update profile" });
  }
};

export const requestStaffContactChange = async (req, res) => {
  try {
    const purpose = String(req.body?.purpose || "");
    if (!PURPOSES.has(purpose)) return res.status(400).json({ success: false, message: "Invalid contact change purpose" });
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, email: true, isEmailVerified: true } });
    if (!user?.isEmailVerified) return res.status(400).json({ success: false, message: "Your current email must be verified" });
    const existing = await prisma.staffContactChange.findUnique({ where: { userId: user.id } });
    if (existing && Date.now() - existing.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
      return res.status(429).json({ success: false, message: "Please wait before requesting another code" });
    }
    const code = createContactChangeCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);
    const challenge = await prisma.staffContactChange.upsert({
      where: { userId: user.id },
      create: { userId: user.id, purpose, codeHash: hash(code), expiresAt, lastSentAt: new Date() },
      update: { purpose, codeHash: hash(code), expiresAt, attempts: 0, lastSentAt: new Date(), authorizationHash: null, authorizationExpiresAt: null },
    });
    try {
      await sendStaffContactChangeEmail({ email: user.email, code, purpose });
    } catch (error) {
      await prisma.staffContactChange.deleteMany({ where: { id: challenge.id } });
      if (process.env.NODE_ENV !== "production") console.error("Staff contact email delivery failed:", error?.message);
      return res.status(502).json({ success: false, message: "Unable to send verification code" });
    }
    scheduleStaffContactChangeCleanup(challenge.id, expiresAt);
    return res.json({ success: true, message: "Verification code sent to your current verified email" });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.error("Staff contact request failed:", error?.message);
    return res.status(500).json({ success: false, message: "Unable to request contact change" });
  }
};

export const verifyStaffContactChange = async (req, res) => {
  try {
    const purpose = String(req.body?.purpose || "");
    const code = String(req.body?.code || "").trim();
    if (!PURPOSES.has(purpose) || !/^\d{6}$/.test(code)) return res.status(400).json({ success: false, message: "Invalid verification code" });
    const challenge = await prisma.staffContactChange.findUnique({ where: { userId: req.user.id } });
    if (!challenge || challenge.purpose !== purpose || challenge.authorizationHash) return res.status(400).json({ success: false, message: "No pending contact change" });
    if (challenge.expiresAt <= new Date()) {
      await prisma.staffContactChange.deleteMany({ where: { id: challenge.id } });
      return res.status(400).json({ success: false, message: "Verification code expired" });
    }
    if (challenge.attempts >= MAX_ATTEMPTS) return res.status(429).json({ success: false, message: "Too many verification attempts. Request a new code" });
    if (!safeEqual(hash(code), challenge.codeHash)) {
      await prisma.staffContactChange.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
      return res.status(400).json({ success: false, message: "Invalid verification code" });
    }
    const authorizationToken = crypto.randomBytes(32).toString("hex");
    const authorizationExpiresAt = new Date(Date.now() + AUTHORIZATION_TTL_MS);
    await prisma.staffContactChange.update({
      where: { id: challenge.id },
      data: { codeHash: "", expiresAt: new Date(), authorizationHash: hash(authorizationToken), authorizationExpiresAt },
    });
    scheduleStaffContactChangeCleanup(challenge.id, authorizationExpiresAt);
    return res.json({ success: true, message: "Verification successful", authorizationToken });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.error("Staff contact verification failed:", error?.message);
    return res.status(500).json({ success: false, message: "Unable to verify contact change" });
  }
};

export const updateStaffContact = async (req, res) => {
  try {
    const purpose = String(req.body?.purpose || "");
    const authorizationToken = String(req.body?.authorizationToken || "");
    if (!PURPOSES.has(purpose) || !authorizationToken) return res.status(400).json({ success: false, message: "Contact change authorization is required" });
    const challenge = await prisma.staffContactChange.findUnique({ where: { userId: req.user.id } });
    if (!challenge || challenge.purpose !== purpose || !challenge.authorizationHash || !safeEqual(hash(authorizationToken), challenge.authorizationHash)) {
      return res.status(403).json({ success: false, message: "Invalid contact change authorization" });
    }
    if (!challenge.authorizationExpiresAt || challenge.authorizationExpiresAt <= new Date()) {
      await prisma.staffContactChange.deleteMany({ where: { id: challenge.id } });
      return res.status(400).json({ success: false, message: "Contact change authorization expired" });
    }
    const current = await prisma.user.findUnique({ where: { id: req.user.id }, select: { email: true, phone: true } });
    let data;
    if (purpose === "EMAIL_CHANGE") {
      const email = String(req.body?.value || "").trim().toLowerCase();
      if (!isValidEmail(email)) return res.status(400).json({ success: false, message: "Valid email is required" });
      if (email === current.email) return res.status(400).json({ success: false, message: "This is already your current email" });
      const duplicate = await prisma.user.findFirst({ where: { email, NOT: { id: req.user.id } }, select: { id: true } });
      if (duplicate) return res.status(409).json({ success: false, message: "Email is already in use" });
      data = { email };
    } else {
      const phone = normalizePhone(req.body?.value);
      if (!phone) return res.status(400).json({ success: false, message: "Valid phone number is required" });
      if (phone === current.phone) return res.status(400).json({ success: false, message: "This is already your current phone number" });
      const duplicate = await prisma.user.findUnique({ where: { phone }, select: { id: true } });
      if (duplicate && duplicate.id !== req.user.id) return res.status(409).json({ success: false, message: "Phone number is already in use" });
      data = { phone };
    }
    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id: req.user.id }, data, select: profileSelect });
      await tx.staffContactChange.delete({ where: { id: challenge.id } });
      return updated;
    });
    return res.json({ success: true, message: purpose === "EMAIL_CHANGE" ? "Email updated successfully" : "Phone number updated successfully", user });
  } catch (error) {
    if (error?.code === "P2002") {
      const target = String(error?.meta?.target || "").toLowerCase();
      return res.status(409).json({ success: false, message: target.includes("phone") ? "Phone number is already in use" : "Email is already in use" });
    }
    if (isPhoneUniqueError(error)) return res.status(409).json({ success: false, message: "Phone number is already in use" });
    if (error?.message === "Valid phone number is required") return res.status(400).json({ success: false, message: error.message });
    if (process.env.NODE_ENV !== "production") console.error("Staff contact update failed:", error?.message);
    return res.status(500).json({ success: false, message: "Unable to update contact information" });
  }
};