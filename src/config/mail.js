// import nodemailer from "nodemailer";
// import dotenv from "dotenv";

// dotenv.config();

// const transporter = nodemailer.createTransport({
//   host: process.env.SMTP_HOST,
//   port: Number(process.env.SMTP_PORT),
//   secure: false,
//   auth: {
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASS,
//   },
// });

// export default transporter;

import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const smtpPort = Number(process.env.SMTP_PORT || 587);

const smtpSecure =
  String(process.env.SMTP_SECURE ?? smtpPort === 465)
    .trim()
    .toLowerCase() === "true";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: smtpSecure,

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },

  connectionTimeout: 15_000,
  greetingTimeout: 10_000,
  socketTimeout: 30_000,
});

export const verifyMailTransport = async () => {
  try {
    await transporter.verify();
    console.log("SMTP transporter is ready");
    return true;
  } catch (error) {
    console.error(
      "SMTP transporter verification failed:",
      error?.code || error?.message || "Unknown SMTP error"
    );

    return false;
  }
};

const shouldVerifyOnStartup =
  String(process.env.SMTP_VERIFY_ON_STARTUP || "")
    .trim()
    .toLowerCase() === "true";

if (shouldVerifyOnStartup) {
  void verifyMailTransport();
}

export default transporter;