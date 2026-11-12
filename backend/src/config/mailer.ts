import nodemailer, { Transporter } from "nodemailer";

// SMTP for share notifications. Without SMTP_HOST, sharing still works; no email is sent.
//   Gmail:    smtp.gmail.com:465 (secure), user = your address, pass = an App Password
//   Resend:   smtp.resend.com:465, user = "resend", pass = API key
//   Mailtrap: sandbox.smtp.mailtrap.io:2525 (for local testing)
export const isMailEnabled = () => Boolean(process.env.SMTP_HOST);

// Public URL of the frontend, used for "Open document" links in emails
export const APP_URL = (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");

let transporter: Transporter | null = null;

export const getMailer = (): Transporter => {
    if (!transporter) {
        const port = Number(process.env.SMTP_PORT || 587);
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port,
            // Implicit TLS on 465; STARTTLS otherwise
            secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
            auth: process.env.SMTP_USER
                ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
                : undefined,
        });
    }
    return transporter;
};

export const MAIL_FROM = () =>
    process.env.SMTP_FROM || process.env.SMTP_USER || "Docs <no-reply@localhost>";
