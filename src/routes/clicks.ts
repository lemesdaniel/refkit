// src/routes/clicks.ts
import { Hono } from 'hono'
import { db } from '../db'
import { affiliates, clicks } from '../db/schema'
import { eq } from 'drizzle-orm'

export const clicksRoute = new Hono()

clicksRoute.post('/', async (c) => {
  try {
    const body = await c.req.json<{
      program_id?: string
      slug?: string
      visitor_token?: string
      referrer?: string | null
    }>()

    if (!body.slug || !body.visitor_token || !body.program_id) {
      return c.json({ ok: true }) // sempre 200 — nunca bloqueia o browser
    }

    const affiliate = await db.query.affiliates.findFirst({
      where: eq(affiliates.slug, body.slug),
    })

    if (!affiliate || affiliate.status !== 'active') {
      return c.json({ ok: true })
    }

    const ip = c.req.header('x-forwarded-for')?.split(',')[0].trim()
      ?? c.req.header('cf-connecting-ip')
      ?? null

    await db.insert(clicks).values({
      id: crypto.randomUUID(),
      affiliateId: affiliate.id,
      visitorToken: body.visitor_token,
      referrer: body.referrer ?? null,
      ip,
    })
  } catch {
    // nunca bloqueia o browser — falha silenciosa
  }

  return c.json({ ok: true })
})
