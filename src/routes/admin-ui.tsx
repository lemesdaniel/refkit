import { Hono } from 'hono'
import { setCookie, deleteCookie } from 'hono/cookie'
import { compare } from 'bcryptjs'
import { eq, desc, gte, sql } from 'drizzle-orm'
import { db } from '../db'
import { adminUser, affiliates, events, commissions, program, commissionRules, magicLinks } from '../db/schema'
import { signJwt } from '../lib/jwt'
import { adminCookieAuth } from '../middleware/admin-cookie-auth'
import { env } from '../config'
import { sendEmail } from '../lib/email'
import { AdminLoginPage } from '../views/pages/admin/login'
import { AdminDashboardPage } from '../views/pages/admin/dashboard'
import { AdminProgramPage } from '../views/pages/admin/program'
import { AdminAffiliatesPage } from '../views/pages/admin/affiliates'
import { AdminRulesPage } from '../views/pages/admin/rules'
import { AdminCommissionsPage } from '../views/pages/admin/commissions'
import { AdminEventsPage } from '../views/pages/admin/events'

export const adminUiRoute = new Hono()

// Login page
adminUiRoute.get('/login', (c) => {
  return c.html(<AdminLoginPage />)
})

// Login action
adminUiRoute.post('/login', async (c) => {
  const form = await c.req.parseBody()
  const password = form.password as string

  if (!password) {
    return c.html(<AdminLoginPage error="Password required" />)
  }

  const admin = await db.query.adminUser.findFirst({
    where: eq(adminUser.email, env.ADMIN_EMAIL),
  })
  if (!admin) {
    return c.html(<AdminLoginPage error="Not set up. Use the API to run /admin/setup first." />)
  }

  const valid = await compare(password, admin.passwordHash)
  if (!valid) {
    return c.html(<AdminLoginPage error="Invalid password" />)
  }

  const token = await signJwt({ sub: admin.id, role: 'admin' }, '30d')
  setCookie(c, 'rk_admin', token, {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  })
  return c.redirect('/panel')
})

// Logout
adminUiRoute.post('/logout', (c) => {
  deleteCookie(c, 'rk_admin', { path: '/' })
  return c.redirect('/panel/login')
})

// Dashboard
adminUiRoute.get('/', adminCookieAuth, async (c) => {
  const success = c.req.query('success') || null

  const totalAffiliates = await db
    .select({ count: sql<number>`count(*)` })
    .from(affiliates)
    .where(eq(affiliates.status, 'active'))

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const recentEventsCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(events)
    .where(gte(events.createdAt, yesterday))

  const pendingTotal = await db
    .select({ total: sql<number>`coalesce(sum(${commissions.amount}), 0)` })
    .from(commissions)
    .where(eq(commissions.status, 'pending'))

  const recentEvents = await db
    .select()
    .from(events)
    .orderBy(desc(events.createdAt))
    .limit(5)

  return c.html(
    <AdminDashboardPage
      totalAffiliates={Number(totalAffiliates[0].count)}
      recentEventsCount={Number(recentEventsCount[0].count)}
      pendingCommissionsTotal={Number(pendingTotal[0].total)}
      recentEvents={recentEvents}
      success={success}
    />
  )
})

// Program
adminUiRoute.get('/program', adminCookieAuth, async (c) => {
  const success = c.req.query('success') || null
  const error = c.req.query('error') || null
  const prog = await db.query.program.findFirst()
  return c.html(<AdminProgramPage program={prog ?? null} success={success} error={error} />)
})

adminUiRoute.post('/program', adminCookieAuth, async (c) => {
  const form = await c.req.parseBody()
  const name = form.name as string
  const websiteUrl = form.websiteUrl as string
  const cookieDays = Number(form.cookieDays) || 30

  if (!name || !websiteUrl) {
    return c.redirect('/panel/program?error=Name and website URL are required')
  }

  const existing = await db.query.program.findFirst()
  if (existing) {
    await db.update(program).set({ name, websiteUrl, cookieDays }).where(eq(program.id, existing.id))
  } else {
    const id = crypto.randomUUID()
    const apiKey = crypto.randomUUID()
    await db.insert(program).values({ id, name, websiteUrl, apiKey, cookieDays })
  }

  return c.redirect('/panel/program?success=Program saved')
})

// Affiliates
adminUiRoute.get('/affiliates', adminCookieAuth, async (c) => {
  const success = c.req.query('success') || null
  const error = c.req.query('error') || null
  const allAffiliates = await db.select().from(affiliates).orderBy(desc(affiliates.createdAt))
  return c.html(<AdminAffiliatesPage affiliates={allAffiliates} success={success} error={error} />)
})

adminUiRoute.post('/affiliates/:id/status', adminCookieAuth, async (c) => {
  const id = c.req.param('id')
  const form = await c.req.parseBody()
  const status = form.status as string
  await db.update(affiliates).set({ status }).where(eq(affiliates.id, id))
  return c.redirect('/panel/affiliates?success=Status updated')
})

adminUiRoute.post('/affiliates/invite', adminCookieAuth, async (c) => {
  const form = await c.req.parseBody()
  const name = form.name as string
  const email = form.email as string
  const slug = form.slug as string

  if (!name || !email || !slug) {
    return c.redirect('/panel/affiliates?error=All fields are required')
  }

  // Check uniqueness
  const existingEmail = await db.query.affiliates.findFirst({ where: eq(affiliates.email, email) })
  if (existingEmail) {
    return c.redirect('/panel/affiliates?error=Email already in use')
  }
  const existingSlug = await db.query.affiliates.findFirst({ where: eq(affiliates.slug, slug) })
  if (existingSlug) {
    return c.redirect('/panel/affiliates?error=Slug already in use')
  }

  const prog = await db.query.program.findFirst()
  if (!prog) {
    return c.redirect('/panel/affiliates?error=Configure program first')
  }

  const affiliateId = crypto.randomUUID()
  await db.insert(affiliates).values({
    id: affiliateId,
    programId: prog.id,
    name,
    email,
    slug,
    status: 'active',
  })

  // Create magic link
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await db.insert(magicLinks).values({
    id: crypto.randomUUID(),
    affiliateId,
    token,
    expiresAt,
  })

  // Send email (non-blocking)
  try {
    await sendEmail(
      email,
      `You've been invited to ${prog.name} affiliate program`,
      `<p>Hi ${name},</p><p>You've been invited as an affiliate. Access your portal here:</p><p><a href="${env.BASE_URL}/portal/auth?token=${token}">Access Portal</a></p>`
    )
  } catch (e) {
    console.error('Failed to send invite email:', e)
  }

  return c.redirect('/panel/affiliates?success=Affiliate invited')
})

// Rules
adminUiRoute.get('/rules', adminCookieAuth, async (c) => {
  const success = c.req.query('success') || null
  const error = c.req.query('error') || null
  const prog = await db.query.program.findFirst()
  const rules = prog
    ? await db.select().from(commissionRules).where(eq(commissionRules.programId, prog.id))
    : []
  return c.html(<AdminRulesPage rules={rules} hasProgram={!!prog} success={success} error={error} />)
})

adminUiRoute.post('/rules', adminCookieAuth, async (c) => {
  const form = await c.req.parseBody()
  const eventName = form.eventName as string
  const commissionType = form.commissionType as string
  const commissionValue = Number(form.commissionValue)

  if (!eventName || !commissionType || isNaN(commissionValue)) {
    return c.redirect('/panel/rules?error=All fields are required')
  }

  const prog = await db.query.program.findFirst()
  if (!prog) {
    return c.redirect('/panel/rules?error=Configure program first')
  }

  await db.insert(commissionRules).values({
    id: crypto.randomUUID(),
    programId: prog.id,
    eventName,
    commissionType,
    commissionValue,
  })

  return c.redirect('/panel/rules?success=Rule added')
})

adminUiRoute.post('/rules/:id/delete', adminCookieAuth, async (c) => {
  const id = c.req.param('id')
  await db.delete(commissionRules).where(eq(commissionRules.id, id))
  return c.redirect('/panel/rules?success=Rule deleted')
})

// Commissions
adminUiRoute.get('/commissions', adminCookieAuth, async (c) => {
  const success = c.req.query('success') || null
  const error = c.req.query('error') || null
  const allCommissions = await db.select().from(commissions).orderBy(desc(commissions.createdAt)).limit(100)
  return c.html(<AdminCommissionsPage commissions={allCommissions} success={success} error={error} />)
})

adminUiRoute.post('/commissions/:id/pay', adminCookieAuth, async (c) => {
  const id = c.req.param('id')
  await db.update(commissions).set({ status: 'paid', paidAt: new Date() }).where(eq(commissions.id, id))
  return c.redirect('/panel/commissions?success=Commission marked as paid')
})

// Events
adminUiRoute.get('/events', adminCookieAuth, async (c) => {
  const success = c.req.query('success') || null
  const error = c.req.query('error') || null
  const allEvents = await db.select().from(events).orderBy(desc(events.createdAt)).limit(100)
  return c.html(<AdminEventsPage events={allEvents} success={success} error={error} />)
})
