const WHATSAPP_BASE_URL = "https://wa.me";
export const SUPPORT_EMAIL = "support@juragankasir.com";

export const CONSULT_CHANNEL = Object.freeze({ whatsapp: "whatsapp", email: "email" });

export const resolveConsultChannel = ({ whatsappNumber, message, emailSubject }) => {
  const encodedMessage = encodeURIComponent(message);
  if (whatsappNumber) {
    return {
      type: CONSULT_CHANNEL.whatsapp,
      href: `${WHATSAPP_BASE_URL}/${whatsappNumber}?text=${encodedMessage}`
    };
  }
  const encodedSubject = encodeURIComponent(emailSubject);
  return {
    type: CONSULT_CHANNEL.email,
    href: `mailto:${SUPPORT_EMAIL}?subject=${encodedSubject}&body=${encodedMessage}`
  };
};
