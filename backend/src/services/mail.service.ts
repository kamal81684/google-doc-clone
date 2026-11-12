import nodemailer from "nodemailer";
import { APP_URL, MAIL_FROM, getMailer, isMailEnabled } from "../config/mailer";

const escapeHtml = (value: string) =>
    value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

interface ShareNotification {
    to: string;
    sharerName: string;
    sharerEmail: string;
    documentId: string;
    documentTitle: string;
    role: "VIEWER" | "EDITOR";
    message?: string | undefined;
}

/**
 * Emails someone that a document was shared with them, like Google Docs' "Notify people".
 * Returns false (without throwing) when SMTP isn't configured.
 */
const sendShareNotification = async ({
    to,
    sharerName,
    sharerEmail,
    documentId,
    documentTitle,
    role,
    message,
}: ShareNotification): Promise<boolean> => {
    if (!isMailEnabled()) return false;

    const url = `${APP_URL}/documents/${documentId}`;
    const verb = role === "EDITOR" ? "edit" : "view";
    const title = documentTitle || "Untitled Document";
    const note = message?.trim();

    const subject = `Document shared with you: "${title}"`;

    const text = [
        `${sharerName} (${sharerEmail}) shared a document with you and invited you to ${verb} it.`,
        "",
        note ? `"${note}"\n` : null,
        title,
        url,
    ]
        .filter((line) => line !== null)
        .join("\n");

    const html = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#202124">
  <p style="font-size:15px;margin:0 0 16px">
    <strong>${escapeHtml(sharerName)}</strong> (${escapeHtml(sharerEmail)}) shared a document with you
    and invited you to <strong>${verb}</strong> it.
  </p>
  ${
      note
          ? `<blockquote style="margin:0 0 16px;padding:12px 16px;background:#f1f3f4;border-radius:8px;font-size:14px;white-space:pre-wrap">${escapeHtml(note)}</blockquote>`
          : ""
  }
  <div style="border:1px solid #dadce0;border-radius:8px;padding:16px;margin:0 0 20px">
    <p style="margin:0;font-size:15px;font-weight:600">${escapeHtml(title)}</p>
  </div>
  <a href="${url}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;font-weight:600">Open</a>
  <p style="margin:24px 0 0;font-size:12px;color:#5f6368">
    You received this email because ${escapeHtml(sharerEmail)} shared a document with you.
  </p>
</div>`;

    const info = await getMailer().sendMail({
        from: MAIL_FROM(),
        to,
        replyTo: sharerEmail,
        subject,
        text,
        html,
    });
    // Test inboxes like Ethereal give a URL to view the captured message
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`Share email sent to ${to}${previewUrl ? `, preview: ${previewUrl}` : ""}`);
    return true;
};

export { sendShareNotification };
