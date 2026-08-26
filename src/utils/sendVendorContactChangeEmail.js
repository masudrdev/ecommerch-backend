import transporter from "../config/mail.js";

const sendVendorContactChangeEmail = async ({ email, code }) => {
  await transporter.sendMail({
    from: "FriendBazar <no-reply@friendbazar.com>",
    to: email,
    subject: "Verify your Vendor Profile contact change",
    html: `
      <h2>Vendor Profile contact change</h2>
      <p>A request was made to change your Vendor Profile email or phone.</p>
      <p>Your verification code is:</p>
      <h1>${code}</h1>
      <p>This code expires in 1 minute.</p>
      <p>If you did not request this change, you can ignore this email.</p>
    `,
  });
};

export default sendVendorContactChangeEmail;