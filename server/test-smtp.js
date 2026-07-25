// test-smtp.js
// Standalone sanity check — run this directly to confirm your Gmail SMTP
// credentials actually work, before testing the full forgot-password flow.
//
// Usage:
//   1. Place this file at your project root (same level as package.json)
//   2. node test-smtp.js
//
// Uses your existing .env, so run it from wherever `require("dotenv").config()`
// would normally pick it up.

require("dotenv").config();
const nodemailer = require("nodemailer");

async function main() {
  console.log("Testing SMTP connection with:");
  console.log("  SMTP_HOST:", process.env.SMTP_HOST);
  console.log("  SMTP_PORT:", process.env.SMTP_PORT);
  console.log("  SMTP_USER:", process.env.SMTP_USER);
  console.log(
    "  SMTP_PASS:",
    process.env.SMTP_PASS ? "(set, hidden)" : "(MISSING)",
  );
  console.log("");

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // verify() just checks the connection/auth without sending anything —
  // fastest way to catch a bad App Password before sending a real email.
  try {
    await transporter.verify();
    console.log("✓ SMTP connection + auth succeeded.");
  } catch (err) {
    console.error("✗ SMTP connection/auth FAILED:", err.message);
    process.exit(1);
  }

  // Now actually send a test email to yourself.
  try {
    const info = await transporter.sendMail({
      from: `"Receiptify Test" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // sends to yourself
      subject: "Receiptify SMTP test",
      text: "If you're reading this, your SMTP setup works.",
      html: "<p>If you're reading this, your SMTP setup works.</p>",
    });
    console.log("✓ Test email sent. Message ID:", info.messageId);
    console.log("Check the inbox for:", process.env.SMTP_USER);
  } catch (err) {
    console.error("✗ Sending test email FAILED:", err.message);
    process.exit(1);
  }
}

main();
