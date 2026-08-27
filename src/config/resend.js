import { Resend } from "resend";

let resendClient;

const getConfiguration = () => {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  const from = String(process.env.RESEND_FROM_EMAIL || "").trim();

  if (!apiKey || !from) {
    const error = new Error("Email delivery is not configured");
    error.code = "EMAIL_CONFIGURATION_ERROR";
    throw error;
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }

  return { resendClient, from };
};

const deliveryFailure = (code = "RESEND_DELIVERY_ERROR") => {
  const error = new Error("Email delivery failed");
  error.code = code;
  return error;
};

export const sendResendEmail = async ({ to, subject, html }) => {
  const { resendClient: resend, from } = getConfiguration();

  let response;
  try {
    response = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });
  } catch {
    throw deliveryFailure();
  }

  if (response.error) {
    throw deliveryFailure(response.error.name || "RESEND_DELIVERY_ERROR");
  }

  return response.data;
};
