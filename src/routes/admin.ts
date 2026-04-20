// src/routes/admin.ts
import { Hono } from 'hono'
import { hash, compare } from 'bcryptjs'
import { eq, desc } from 'drizzle-orm'
import { db } from '../db'
import {
  adminUser,
  program,
  affiliates,
  commissionRules,
  commissions,
  events,
  magicLinks,
} from '../db/schema'
import { signJwt } from '../lib/jwt'
import { adminAuth } from '../middleware/admin-auth'
import { env } from '../config'
import { sendEmail } from '../lib/email'

export const adminRoute = new Hono()

// POST /admin/setup — criar conta admin (desabilitado após primeiro uso)
adminRoute.post('/setup', async (c) => {
  const existing = await db.query.adminUser.findFirst()
  if (existing) return c.json({ error: 'Already set up' }, 403)

  const body = await c.req.json<{ password?: string }>()
  if (!body.password || body.password.length < 8) {
    return c.json({ error: 'Password must be at least 8 characters' }, 400)
  }

  const passwordHash = await hash(body.password, 12)
  await db.insert(adminUser).values({
    id: crypto.randomUUID(),
    email: env.ADMIN_EMAIL,
    passwordHash,
  })

  return c.json({ ok: true })
})

// POST /admin/auth — login admin
adminRoute.post('/auth', async (c) => {
  const body = await c.req.json<{ password?: string }>()
  if (!body.password) return c.json({ error: 'Password required' }, 400)

  const admin = await db.query.adminUser.findFirst({
    where: eq(adminUser.email, env.ADMIN_EMAIL),
  })
  if (!admin) return c.json({ error: 'Not set up' }, 403)

  const valid = await compare(body.password, admin.passwordHash)
  if (!valid) return c.json({ error: 'Invalid password' }, 401)

  const token = await signJwt({ sub: admin.id, role: 'admin' }, '30d')
  return c.json({ token })
})

// --- Protected routes below ---

// GET /admin/program
adminRoute.get('/program', adminAuth, async (c) => {
  const prog = await db.query.program.findFirst()
  return c.json({ program: prog ?? null })
})

// PUT /admin/program — create or update program
adminRoute.put('/program', adminAuth, async (c) => {
  const body = await c.req.json<{ name?: string; websiteUrl?: string; cookieDays?: number }>()
  if (!body.name || !body.websiteUrl) {
    return c.json({ error: 'name and websiteUrl are required' }, 400)
  }

  const existing = await db.query.program.findFirst()
  if (existing) {
    const updated = await db
      .update(program)
      .set({
        name: body.name,
        websiteUrl: body.websiteUrl,
        ...(body.cookieDays !== undefined ? { cookieDays: body.cookieDays } : {}),
      })
      .where(eq(program.id, existing.id))
      .returning()
    return c.json({ program: updated[0] })
  }

  const id = crypto.randomUUID()
  const apiKey = crypto.randomUUID()
  const inserted = await db
    .insert(program)
    .values({
      id,
      name: body.name,
      websiteUrl: body.websiteUrl,
      apiKey,
      cookieDays: body.cookieDays ?? 30,
    })
    .returning()

  return c.json({ program: inserted[0] })
})

// GET /admin/affiliates
adminRoute.get('/affiliates', adminAuth, async (c) => {
  const list = await db
    .select()
    .from(affiliates)
    .orderBy(desc(affiliates.createdAt))
  return c.json({ affiliates: list })
})

// POST /admin/affiliates/invite
adminRoute.post('/affiliates/invite', adminAuth, async (c) => {
  const body = await c.req.json<{ name?: string; email?: string; slug?: string }>()
  if (!body.name || !body.email || !body.slug) {
    return c.json({ error: 'name, email, and slug are required' }, 400)
  }

  // Check program exists
  const prog = await db.query.program.findFirst()
  if (!prog) {
    return c.json({ error: 'Program not configured yet' }, 400)
  }

  // Check uniqueness
  const existingEmail = await db.query.affiliates.findFirst({
    where: eq(affiliates.email, body.email),
  })
  if (existingEmail) {
    return c.json({ error: 'Email already in use' }, 409)
  }

  const existingSlug = await db.query.affiliates.findFirst({
    where: eq(affiliates.slug, body.slug),
  })
  if (existingSlug) {
    return c.json({ error: 'Slug already in use' }, 409)
  }

  const affiliateId = crypto.randomUUID()
  await db.insert(affiliates).values({
    id: affiliateId,
    programId: prog.id,
    name: body.name,
    email: body.email,
    slug: body.slug,
    status: 'active',
  })

  // Create magic link
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  await db.insert(magicLinks).values({
    id: crypto.randomUUID(),
    affiliateId,
    token,
    expiresAt,
  })

  // Send welcome email (best-effort, don't fail the invite if email fails)
  const magicUrl = `${env.BASE_URL}/auth?token=${token}`
  try {
    await sendEmail(
      body.email,
      'Welcome to the affiliate program!',
      `<p>Hi ${body.name},</p>
       <p>You've been invited to join the affiliate program.</p>
       <p><a href="${magicUrl}">Click here to access your dashboard</a></p>`,
    )
  } catch (err) {
    console.warn('[EMAIL ERROR]', err)
  }

  return c.json({ ok: true })
})

// PATCH /admin/affiliates/:id
adminRoute.patch('/affiliates/:id', adminAuth, async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json<{ status?: string }>()

  if (!body.status || !['active', 'inactive', 'pending'].includes(body.status)) {
    return c.json({ error: 'status must be active, inactive, or pending' }, 400)
  }

  const existing = await db.query.affiliates.findFirst({
    where: eq(affiliates.id, id),
  })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  await db
    .update(affiliates)
    .set({ status: body.status })
    .where(eq(affiliates.id, id))

  return c.json({ ok: true })
})

// GET /admin/commission-rules
adminRoute.get('/commission-rules', adminAuth, async (c) => {
  const rules = await db.select().from(commissionRules)
  return c.json({ rules })
})

// POST /admin/commission-rules
adminRoute.post('/commission-rules', adminAuth, async (c) => {
  const body = await c.req.json<{
    programId?: string
    eventName?: string
    commissionType?: string
    commissionValue?: number
  }>()

  if (!body.programId || !body.eventName || !body.commissionType || body.commissionValue == null) {
    return c.json({ error: 'programId, eventName, commissionType, and commissionValue are required' }, 400)
  }

  if (!['percent', 'fixed'].includes(body.commissionType)) {
    return c.json({ error: 'commissionType must be percent or fixed' }, 400)
  }

  await db.insert(commissionRules).values({
    id: crypto.randomUUID(),
    programId: body.programId,
    eventName: body.eventName,
    commissionType: body.commissionType,
    commissionValue: body.commissionValue,
  })

  return c.json({ ok: true })
})

// DELETE /admin/commission-rules/:id
adminRoute.delete('/commission-rules/:id', adminAuth, async (c) => {
  const { id } = c.req.param()

  const existing = await db.query.commissionRules.findFirst({
    where: eq(commissionRules.id, id),
  })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  await db.delete(commissionRules).where(eq(commissionRules.id, id))

  return c.json({ ok: true })
})

// GET /admin/commissions
adminRoute.get('/commissions', adminAuth, async (c) => {
  const list = await db
    .select()
    .from(commissions)
    .orderBy(desc(commissions.createdAt))
    .limit(100)
  return c.json({ commissions: list })
})

// PATCH /admin/commissions/:id/pay
adminRoute.patch('/commissions/:id/pay', adminAuth, async (c) => {
  const { id } = c.req.param()

  const existing = await db.query.commissions.findFirst({
    where: eq(commissions.id, id),
  })
  if (!existing) return c.json({ error: 'Not found' }, 404)
  if (existing.status === 'paid') return c.json({ error: 'Already paid' }, 400)

  await db
    .update(commissions)
    .set({ status: 'paid', paidAt: new Date() })
    .where(eq(commissions.id, id))

  return c.json({ ok: true })
})

// GET /admin/events
adminRoute.get('/events', adminAuth, async (c) => {
  const list = await db
    .select()
    .from(events)
    .orderBy(desc(events.createdAt))
    .limit(100)
  return c.json({ events: list })
})
