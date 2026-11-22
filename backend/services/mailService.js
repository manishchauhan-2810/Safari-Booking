import nodemailer from "nodemailer";

let transporter = null;

export const isMailConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const getTransporter = () => {
  if (!transporter) {
    if (!isMailConfigured()) throw new Error("SMTP is not configured");
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      // A small pool queues bursts of invoices instead of opening hundreds of SMTP connections
      pool: true,
      maxConnections: 3,
      maxMessages: 50,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
    });
  }
  return transporter;
};

export const verifySmtp = () => getTransporter().verify();

export const sendMail = (options) =>
  getTransporter().sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, ...options });