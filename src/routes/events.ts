// src/routes/events.ts
import { Hono } from 'hono'
import { db } from '../db'
import { program, events, commissions } from '../db/schema'
import { eq } from 'drizzle-orm'
import { resolveAffiliate } from '../modules/tracking'
import { calculateCommission } from '../modules/commissions'
import type { RefkitPlugin } from '../plugins/types'

// Plugin context é injetado pelo createApp
export function createEventsRoute(plugins: RefkitPlugin[]) {
  const route = new Hono()

  route.post('/', async (c) => {
    // Auth
    const authHeader = c.req.header('authorization') ?? ''
    const apiKey = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!apiKey) return c.json({ error: 'Unauthorized' }, 401)

    const prog = await db.query.program.findFirst({
      where: eq(program.apiKey, apiKey),
    })
    if (!prog) return c.json({ error: 'Invalid API key' }, 401)

    // Validate body
    const body = await c.req.json<{
      event?: string
      visitor_token?: string
      revenue?: number
      metadata?: Record<string, unknown>
    }>()
    if (!body.event) return c.json({ error: 'event is required' }, 400)

    // Attribution
    let affiliateId: string | null = null
    if (body.visitor_token) {
      const resolved = await resolveAffiliate(body.visitor_token, prog.id)
      affiliateId = resolved?.affiliateId ?? null
    }

    // Insert event
    const eventId = crypto.randomUUID()
    await db.insert(events).values({
      id: eventId,
      programId: prog.id,
      affiliateId,
      visitorToken: body.visitor_token ?? null,
      eventName: body.event,
      revenue: body.revenue ?? null,
      metadata: body.metadata ?? null,
    })

    // Commission
    if (affiliateId) {
      const amount = await calculateCommission(prog.id, body.event, body.revenue ?? null)
      if (amount !== null) {
        await db.insert(commissions).values({
          id: crypto.randomUUID(),
          eventId,
          affiliateId,
          amount,
          status: 'pending',
        })
      }
    }

    // Notify plugins
    const refkitEvent = {
      id: eventId,
      programId: prog.id,
      affiliateId,
      eventName: body.event,
      revenue: body.revenue ?? null,
      metadata: body.metadata ?? null,
    }
    await Promise.allSettled(plugins.map(p => p.onEvent?.(refkitEvent)))

    return c.json({ ok: true, event_id: eventId })
  })

  return route
}
