import { sendResendEmail } from "../config/resend.js";

const labels = {
  EMAIL_CHANGE: "email address",
  PHONE_CHANGE: "phone number",
};

const sendStaffContactChangeEmail = async ({ email, code, purpose }) => {
  const target = labels[purpose] || "contact information";
  await sendResendEmail({
    to: email,
    subject: `Verify your FriendBazar ${target} change`,
    html: `
      <h2>My Profile contact change</h2>
      <p>A request was made to change your FriendBazar account ${target}.</p>
      <p>Your verification code is:</p>
      <h1>${code}</h1>
      <p>This code expires in 1 minute.</p>
      <p>If you did not request this change, you can ignore this email.</p>
    `,
  });
};

export default sendStaffContactChangeEmail;