// src/lib/email.ts
import { env } from '../config'

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!env.SMTP_HOST || !env.SMTP_USER) {
    console.log(`[EMAIL DISABLED] To: ${to} | Subject: ${subject}`)
    return
  }

  const nodemailer = await import('nodemailer')
  const transporter = nodemailer.default.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS ?? '',
    },
  })

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
  })
}
