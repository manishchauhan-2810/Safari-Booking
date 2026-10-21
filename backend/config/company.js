export const getCompany = () => ({
  name: process.env.COMPANY_NAME || "Corbett Safari Booking",
  address: process.env.COMPANY_ADDRESS || "",
  gstin: process.env.COMPANY_GSTIN || "",
  email: process.env.COMPANY_EMAIL || process.env.SMTP_USER || "",
  phone: process.env.COMPANY_PHONE || "",
});