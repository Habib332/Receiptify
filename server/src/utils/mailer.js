const nodemailer = require("nodemailer");

// SMTP_* env vars point at your provider (SendGrid, Resend, SES, Mailgun,
// or Gmail SMTP with an App Password for low volume / dev). Gmail's normal
// account password will NOT work here — needs an App Password from
// Google Account > Security > 2-Step Verification > App Passwords.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendPasswordResetEmail({ to, resetUrl }) {
  await transporter.sendMail({
    from: `"Receiptify" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject: "Reset your password",
    text: `Reset your password using this link (valid for 30 minutes): ${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
    html: `
      <p>We received a request to reset your Receiptify password.</p>
      <p><a href="${resetUrl}">Click here to reset your password</a> (valid for 30 minutes).</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });
}

module.exports = { sendPasswordResetEmail };
