// src/routes/affiliate.ts
import { Hono } from 'hono'
import { eq, and, isNull } from 'drizzle-orm'
import { db } from '../db'
import { affiliates, magicLinks } from '../db/schema'
import { signJwt } from '../lib/jwt'
import { sendEmail } from '../lib/email'
import { env } from '../config'
import { affiliateAuth } from '../middleware/affiliate-auth'

export const affiliateRoute = new Hono()

// POST /affiliate/magic-link — request a magic link by email
affiliateRoute.post('/magic-link', async (c) => {
  const body = await c.req.json<{ email?: string }>()
  if (!body.email) return c.json({ error: 'email is required' }, 400)

  // Always return ok to prevent email enumeration
  const affiliate = await db.query.affiliates.findFirst({
    where: and(eq(affiliates.email, body.email), eq(affiliates.status, 'active')),
  })

  if (affiliate) {
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await db.insert(magicLinks).values({
      id: crypto.randomUUID(),
      affiliateId: affiliate.id,
      token,
      expiresAt,
    })

    const magicUrl = `${env.BASE_URL}/affiliate/auth?token=${token}`
    try {
      await sendEmail(
        body.email,
        'Your login link',
        `<p>Hi ${affiliate.name},</p>
         <p><a href="${magicUrl}">Click here to access your dashboard</a></p>
         <p>This link expires in 1 hour.</p>`,
      )
    } catch (err) {
      console.warn('[EMAIL ERROR]', err)
    }
  }

  return c.json({ ok: true })
})

// GET /affiliate/auth?token=... — validate magic link and return JWT
affiliateRoute.get('/auth', async (c) => {
  const token = c.req.query('token')
  if (!token) return c.json({ error: 'Unauthorized' }, 401)

  const link = await db.query.magicLinks.findFirst({
    where: eq(magicLinks.token, token),
  })

  if (!link) return c.json({ error: 'Unauthorized' }, 401)
  if (link.usedAt) return c.json({ error: 'Unauthorized' }, 401)
  if (new Date() > link.expiresAt) return c.json({ error: 'Unauthorized' }, 401)

  // Mark as used
  await db
    .update(magicLinks)
    .set({ usedAt: new Date() })
    .where(eq(magicLinks.id, link.id))

  const jwt = await signJwt({ sub: link.affiliateId, role: 'affiliate' }, '7d')
  return c.json({ token: jwt })
})

// GET /affiliate/dashboard — protected stub
affiliateRoute.get('/dashboard', affiliateAuth, async (c) => {
  return c.json({ ok: true })
})
