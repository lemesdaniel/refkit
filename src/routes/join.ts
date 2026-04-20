// src/routes/join.ts
import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { program, affiliates } from '../db/schema'

export const joinRoute = new Hono()

// GET /join/:program_id — public program info
joinRoute.get('/:program_id', async (c) => {
  const programId = c.req.param('program_id')

  const prog = await db.query.program.findFirst({
    where: eq(program.id, programId),
  })

  if (!prog) return c.json({ error: 'Program not found' }, 404)

  return c.json({
    program: {
      id: prog.id,
      name: prog.name,
      websiteUrl: prog.websiteUrl,
    },
  })
})

// POST /join/:program_id — self-signup for affiliates
joinRoute.post('/:program_id', async (c) => {
  const programId = c.req.param('program_id')

  const prog = await db.query.program.findFirst({
    where: eq(program.id, programId),
  })

  if (!prog) return c.json({ error: 'Program not found' }, 404)

  const body = await c.req.json<{ name?: string; email?: string; slug?: string }>()

  if (!body.name || !body.email || !body.slug) {
    return c.json({ error: 'name, email, and slug are required' }, 400)
  }

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(body.slug)) {
    return c.json({ error: 'slug must contain only lowercase letters, numbers, and hyphens' }, 400)
  }

  // Check email uniqueness
  const existingEmail = await db.query.affiliates.findFirst({
    where: eq(affiliates.email, body.email),
  })
  if (existingEmail) {
    return c.json({ error: 'Email already registered' }, 409)
  }

  // Check slug uniqueness
  const existingSlug = await db.query.affiliates.findFirst({
    where: eq(affiliates.slug, body.slug),
  })
  if (existingSlug) {
    return c.json({ error: 'Slug already taken' }, 409)
  }

  await db.insert(affiliates).values({
    id: crypto.randomUUID(),
    programId,
    name: body.name,
    email: body.email,
    slug: body.slug,
    status: 'pending',
  })

  return c.json({ ok: true, status: 'pending' })
})
