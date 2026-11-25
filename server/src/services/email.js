import nodemailer from 'nodemailer';

let transporter;
function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !process.env.EMAIL_FROM) {
    const error = new Error('Email delivery is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and EMAIL_FROM in server/.env.');
    error.status = 503;
    throw error;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    });
  }
  return transporter;
}

const escapeHtml = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

export async function sendVerificationCode({ email, firstName, code, expiresMinutes }) {
  const safeName = escapeHtml(firstName);
  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `${code} is your Yaza Med verification code`,
    text: `Hi ${firstName}, your Yaza Med verification code is ${code}. It expires in ${expiresMinutes} minutes. If you did not request this, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:24px auto;padding:28px;border:1px solid #e8e9e3;border-radius:12px;color:#193c38"><p style="font-size:12px;letter-spacing:2px;color:#668056;font-weight:bold">YAZA MED</p><h1 style="font-size:24px">Verify your email</h1><p>Hi ${safeName}, use this code to finish creating your account:</p><p style="font-size:34px;letter-spacing:9px;font-weight:bold;background:#f3f5ed;padding:18px;text-align:center;border-radius:8px">${code}</p><p>This code expires in ${expiresMinutes} minutes. If you did not request it, you can ignore this email.</p></div>`
  });
}

export async function sendPasswordResetCode({ email, firstName, code, expiresMinutes }) {
  const safeName = escapeHtml(firstName || 'there');
  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `${code} is your Yaza Med password reset code`,
    text: `Hi ${firstName || 'there'}, use this code to reset your Yaza Med password: ${code}. It expires in ${expiresMinutes} minutes. If you did not request this, ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:24px auto;padding:28px;border:1px solid #e8e9e3;border-radius:12px;color:#193c38"><p style="font-size:12px;letter-spacing:2px;color:#668056;font-weight:bold">YAZA MED</p><h1 style="font-size:24px">Reset your password</h1><p>Hi ${safeName}, use this code to choose a new password:</p><p style="font-size:34px;letter-spacing:9px;font-weight:bold;background:#f3f5ed;padding:18px;text-align:center;border-radius:8px">${code}</p><p>This code expires in ${expiresMinutes} minutes. If you did not request a password reset, you can safely ignore this email.</p></div>`
  });
}
