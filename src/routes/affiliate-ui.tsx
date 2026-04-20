import { Hono } from 'hono'
import { setCookie, deleteCookie } from 'hono/cookie'
import { eq, and, desc, sql } from 'drizzle-orm'
import { db } from '../db'
import { affiliates, magicLinks, commissions, clicks } from '../db/schema'
import { signJwt } from '../lib/jwt'
import { sendEmail } from '../lib/email'
import { affiliateCookieAuth } from '../middleware/affiliate-cookie-auth'
import { env } from '../config'
import { AffiliateLoginPage } from '../views/pages/affiliate/login'
import { AffiliateDashboardPage } from '../views/pages/affiliate/dashboard'
import { AffiliatePayoutPage } from '../views/pages/affiliate/payout'

export const affiliateUiRoute = new Hono()

// Login page
affiliateUiRoute.get('/login', (c) => {
  return c.html(<AffiliateLoginPage />)
})

// Send magic link
affiliateUiRoute.post('/login', async (c) => {
  const form = await c.req.parseBody()
  const email = form.email as string
  if (!email) return c.html(<AffiliateLoginPage error="Email required" />)

  const affiliate = await db.query.affiliates.findFirst({
    where: and(eq(affiliates.email, email), eq(affiliates.status, 'active')),
  })

  if (affiliate) {
    const token = crypto.randomUUID()
    await db.insert(magicLinks).values({
      id: crypto.randomUUID(),
      affiliateId: affiliate.id,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    })
    const magicUrl = `${env.BASE_URL}/portal/auth?token=${token}`
    try {
      await sendEmail(email, 'Your login link',
        `<p>Hi ${affiliate.name},</p><p><a href="${magicUrl}">Click here to access your dashboard</a></p><p>Expires in 1 hour.</p>`)
    } catch (err) { console.warn('[EMAIL ERROR]', err) }
  }

  return c.html(<AffiliateLoginPage sent={true} />)
})

// Auth — exchange magic link for cookie
affiliateUiRoute.get('/auth', async (c) => {
  const token = c.req.query('token')
  if (!token) return c.redirect('/portal/login')

  const link = await db.query.magicLinks.findFirst({ where: eq(magicLinks.token, token) })
  if (!link || link.usedAt || new Date() > link.expiresAt) {
    return c.html(<AffiliateLoginPage error="Invalid or expired link. Request a new one." />)
  }

  await db.update(magicLinks).set({ usedAt: new Date() }).where(eq(magicLinks.id, link.id))

  const jwt = await signJwt({ sub: link.affiliateId, role: 'affiliate' }, '7d')
  setCookie(c, 'rk_affiliate', jwt, {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })
  return c.redirect('/portal')
})

// Logout
affiliateUiRoute.post('/logout', (c) => {
  deleteCookie(c, 'rk_affiliate', { path: '/' })
  return c.redirect('/portal/login')
})

// Dashboard
affiliateUiRoute.get('/', affiliateCookieAuth, async (c) => {
  const affiliateId = c.get('affiliateId') as string
  const success = c.req.query('success') || null

  const affiliate = await db.query.affiliates.findFirst({
    where: eq(affiliates.id, affiliateId),
    columns: { name: true, slug: true, email: true },
  })
  if (!affiliate) return c.redirect('/portal/login')

  const recentCommissions = await db.select().from(commissions)
    .where(eq(commissions.affiliateId, affiliateId))
    .orderBy(desc(commissions.createdAt)).limit(20)

  const pendingRows = await db.select({ total: sql<number>`coalesce(sum(${commissions.amount}), 0)` })
    .from(commissions).where(and(eq(commissions.affiliateId, affiliateId), eq(commissions.status, 'pending')))

  const paidRows = await db.select({ total: sql<number>`coalesce(sum(${commissions.amount}), 0)` })
    .from(commissions).where(and(eq(commissions.affiliateId, affiliateId), eq(commissions.status, 'paid')))

  const clickRows = await db.select({ count: sql<number>`count(*)` })
    .from(clicks).where(eq(clicks.affiliateId, affiliateId))

  return c.html(
    <AffiliateDashboardPage
      affiliate={affiliate}
      stats={{ totalPending: Number(pendingRows[0].total), totalPaid: Number(paidRows[0].total), clickCount: Number(clickRows[0].count) }}
      commissions={recentCommissions}
      baseUrl={env.BASE_URL}
      success={success}
    />
  )
})

// Payout
affiliateUiRoute.get('/payout', affiliateCookieAuth, async (c) => {
  const affiliateId = c.get('affiliateId') as string
  const success = c.req.query('success') || null
  const error = c.req.query('error') || null
  const affiliate = await db.query.affiliates.findFirst({ where: eq(affiliates.id, affiliateId), columns: { payoutEmail: true } })
  return c.html(<AffiliatePayoutPage currentEmail={affiliate?.payoutEmail ?? null} success={success} error={error} />)
})

affiliateUiRoute.post('/payout', affiliateCookieAuth, async (c) => {
  const affiliateId = c.get('affiliateId') as string
  const form = await c.req.parseBody()
  const payoutEmail = form.payoutEmail as string
  if (!payoutEmail) return c.redirect('/portal/payout?error=Email+required')
  await db.update(affiliates).set({ payoutEmail }).where(eq(affiliates.id, affiliateId))
  return c.redirect('/portal/payout?success=Payout+email+updated')
})
