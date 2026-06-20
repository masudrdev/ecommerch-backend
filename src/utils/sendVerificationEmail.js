import transporter from "../config/mail.js";

const sendVerificationEmail = async ({ email, code }) => {
  await transporter.sendMail({
    from: "FriendBazar <no-reply@friendbazar.com>",
    to: email,
    subject: "Verify your FriendBazar account",
    html: `
      <h2>FriendBazar Email Verification</h2>
      <p>Your verification code is:</p>
      <h1>${code}</h1>
      <p>This code will expire in 10 minutes.</p>
    `,
  });
};

export default sendVerificationEmail;