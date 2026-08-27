import { sendResendEmail } from "../config/resend.js";

const sendVerificationEmail = async ({
  email,
  code,
  purpose = "verification",
}) => {
  const isPasswordReset = purpose === "password-reset";

  await sendResendEmail({
    to: email,
    subject: isPasswordReset
      ? "Reset your FriendBazar password"
      : "Verify your FriendBazar account",
    html: `
      <h2>${
        isPasswordReset
          ? "FriendBazar Password Reset"
          : "FriendBazar Email Verification"
      }</h2>
      <p>Your ${
        isPasswordReset ? "password reset" : "verification"
      } code is:</p>
      <h1>${code}</h1>
      <p>This code will expire in 10 minutes.</p>
    `,
  });
};

export default sendVerificationEmail;
