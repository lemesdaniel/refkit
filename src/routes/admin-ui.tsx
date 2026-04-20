import { Hono } from 'hono'
import { setCookie, deleteCookie } from 'hono/cookie'
import { compare } from 'bcryptjs'
import { eq, desc, gte, sql } from 'drizzle-orm'
import { db } from '../db'
import { adminUser, affiliates, events, commissions } from '../db/schema'
import { signJwt } from '../lib/jwt'
import { adminCookieAuth } from '../middleware/admin-cookie-auth'
import { env } from '../config'
import { AdminLoginPage } from '../views/pages/admin/login'
import { AdminDashboardPage } from '../views/pages/admin/dashboard'

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
