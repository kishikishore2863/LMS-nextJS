import "server-only";

/** Email adapter. Logs in dev; wire Resend/SES here via RESEND_API_KEY in production. */
export async function sendEmail(to: string, subject: string, text: string) {
  if (process.env.RESEND_API_KEY) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "LMS <noreply@example.com>", to, subject, text }),
    });
    return;
  }
  if (process.env.NODE_ENV !== "test") console.info(`[email] to=${to} subject="${subject}"`);
}
