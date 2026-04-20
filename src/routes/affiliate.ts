// src/routes/affiliate.ts
import { Hono } from 'hono'
import { eq, and, desc, sql } from 'drizzle-orm'
import { db } from '../db'
import { affiliates, magicLinks, commissions, clicks } from '../db/schema'
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

// GET /affiliate/dashboard — protected
affiliateRoute.get('/dashboard', affiliateAuth, async (c) => {
  const affiliateId = c.get('affiliateId') as string

  const affiliate = await db.query.affiliates.findFirst({
    where: eq(affiliates.id, affiliateId),
    columns: { id: true, name: true, email: true, slug: true, status: true, payoutEmail: true },
  })

  if (!affiliate) return c.json({ error: 'Not found' }, 404)

  const recentCommissions = await db
    .select()
    .from(commissions)
    .where(eq(commissions.affiliateId, affiliateId))
    .orderBy(desc(commissions.createdAt))
    .limit(20)

  const pendingRows = await db
    .select({ total: sql<number>`coalesce(sum(${commissions.amount}), 0)` })
    .from(commissions)
    .where(and(eq(commissions.affiliateId, affiliateId), eq(commissions.status, 'pending')))

  const paidRows = await db
    .select({ total: sql<number>`coalesce(sum(${commissions.amount}), 0)` })
    .from(commissions)
    .where(and(eq(commissions.affiliateId, affiliateId), eq(commissions.status, 'paid')))

  const clickRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(clicks)
    .where(eq(clicks.affiliateId, affiliateId))

  return c.json({
    affiliate,
    stats: {
      totalPending: Number(pendingRows[0].total),
      totalPaid: Number(paidRows[0].total),
      clickCount: Number(clickRows[0].count),
    },
    commissions: recentCommissions,
  })
})

// PATCH /affiliate/payout — update payout email
affiliateRoute.patch('/payout', affiliateAuth, async (c) => {
  const affiliateId = c.get('affiliateId') as string
  const body = await c.req.json<{ payoutEmail?: string }>()

  if (!body.payoutEmail) return c.json({ error: 'payoutEmail is required' }, 400)

  await db
    .update(affiliates)
    .set({ payoutEmail: body.payoutEmail })
    .where(eq(affiliates.id, affiliateId))

  return c.json({ ok: true })
})
