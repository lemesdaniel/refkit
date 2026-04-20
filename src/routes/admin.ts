// src/routes/admin.ts
import { Hono } from 'hono'
import { hash, compare } from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { adminUser, program } from '../db/schema'
import { signJwt } from '../lib/jwt'
import { adminAuth } from '../middleware/admin-auth'
import { env } from '../config'

export const adminRoute = new Hono()

// POST /admin/setup — criar conta admin (desabilitado após primeiro uso)
adminRoute.post('/setup', async (c) => {
  const existing = await db.query.adminUser.findFirst()
  if (existing) return c.json({ error: 'Already set up' }, 403)

  const body = await c.req.json<{ password?: string }>()
  if (!body.password || body.password.length < 8) {
    return c.json({ error: 'Password must be at least 8 characters' }, 400)
  }

  const passwordHash = await hash(body.password, 10)
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

// Stub de rota protegida para testar o middleware
adminRoute.get('/program', adminAuth, async (c) => {
  const prog = await db.query.program.findFirst()
  return c.json({ program: prog ?? null })
})
