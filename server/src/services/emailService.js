import nodemailer from 'nodemailer';

let transporter = null;
let smtpReady = false;

function initTransporter() {
  if (transporter) return transporter;
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });
    smtpReady = true;
  }
  return transporter;
}

// Sends an email if SMTP is configured; otherwise logs it to the console
// (development mode) so the app never crashes for lack of credentials.
export async function sendEmail({ to, subject, text, html }) {
  initTransporter();
  if (!smtpReady) {
    console.log('\n[email:dev-mode] SMTP not configured - logging email instead of sending.');
    console.log(`  To: ${to}\n  Subject: ${subject}\n  Body: ${text}\n`);
    return { sent: false, mode: 'console' };
  }
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'SmartEvent Nepal <no-reply@smarteventnepal.com>',
      to, subject, text, html,
    });
    return { sent: true, mode: 'smtp' };
  } catch (err) {
    console.error('[email] send failed, falling back to console log:', err.message);
    console.log(`  To: ${to}\n  Subject: ${subject}\n  Body: ${text}\n`);
    return { sent: false, mode: 'console', error: err.message };
  }
}
