// src/config.ts
function required(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}

export const env = {
  DATABASE_URL: required('DATABASE_URL'),
  ADMIN_EMAIL:  required('ADMIN_EMAIL'),
  JWT_SECRET:   required('JWT_SECRET'),
  BASE_URL:     process.env.BASE_URL ?? 'http://localhost:3000',
  PORT:         parseInt(process.env.PORT ?? '3000', 10) || 3000,
  SMTP_HOST:    process.env.SMTP_HOST,
  SMTP_PORT:    parseInt(process.env.SMTP_PORT ?? '587', 10) || 587,
  SMTP_USER:    process.env.SMTP_USER,
  SMTP_PASS:    process.env.SMTP_PASS,
  EMAIL_FROM:   process.env.EMAIL_FROM ?? 'noreply@refk.it',
}
