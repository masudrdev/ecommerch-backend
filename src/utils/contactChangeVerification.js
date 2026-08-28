import crypto from "crypto";

export const CONTACT_CODE_TTL_MS = 60 * 1000;
export const CONTACT_CODE_RESEND_MS = 60 * 1000;
export const CONTACT_CODE_MAX_ATTEMPTS = 5;
export const createContactChangeCode = () => crypto.randomInt(100000, 1000000).toString();