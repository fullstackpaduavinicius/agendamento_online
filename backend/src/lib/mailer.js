import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export async function sendMail(to, subject, html) {
  if (!process.env.SMTP_HOST) return; // se não configurou, ignora
  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to, subject, html
  });
}
