// tests/events.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { createApp } from '../src/app'
import { db } from '../src/db'
import { affiliates, clicks, commissionRules, commissions, events, program } from '../src/db/schema'
import { eq } from 'drizzle-orm'

const PROG_ID = 'test-prog-events'
const AFF_ID  = 'test-aff-events'
const API_KEY = 'test-api-key-events'

beforeAll(async () => {
  await db.insert(program).values({
    id: PROG_ID, name: 'Events Test', websiteUrl: 'https://e.com',
    apiKey: API_KEY, cookieDays: 30,
  }).onConflictDoNothing()

  await db.insert(affiliates).values({
    id: AFF_ID, programId: PROG_ID, name: 'Eventer',
    email: 'eventer@e.com', slug: 'eventer', status: 'active',
  }).onConflictDoNothing()

  await db.insert(clicks).values({
    id: 'click-evt', affiliateId: AFF_ID,
    visitorToken: 'rk_evt_visitor', createdAt: new Date(),
  }).onConflictDoNothing()

  await db.insert(commissionRules).values({
    id: 'rule-evt-sale', programId: PROG_ID,
    eventName: 'sale', commissionType: 'percent', commissionValue: 20,
  }).onConflictDoNothing()
})

afterAll(async () => {
  await db.delete(commissions).where(eq(commissions.affiliateId, AFF_ID))
  await db.delete(events).where(eq(events.programId, PROG_ID))
  await db.delete(clicks).where(eq(clicks.affiliateId, AFF_ID))
  await db.delete(commissionRules).where(eq(commissionRules.programId, PROG_ID))
  await db.delete(affiliates).where(eq(affiliates.id, AFF_ID))
  await db.delete(program).where(eq(program.id, PROG_ID))
})

describe('POST /e', () => {
  it('requires Authorization header', async () => {
    const { app } = createApp([])
    const res = await app.request('/e', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'sale' }),
    })
    expect(res.status).toBe(401)
  })

  it('rejects invalid api key', async () => {
    const { app } = createApp([])
    const res = await app.request('/e', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer bad-key' },
      body: JSON.stringify({ event: 'sale' }),
    })
    expect(res.status).toBe(401)
  })

  it('requires event field', async () => {
    const { app } = createApp([])
    const res = await app.request('/e', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })

  it('records event and commission with attribution', async () => {
    const { app } = createApp([])
    const res = await app.request('/e', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        event: 'sale',
        visitor_token: 'rk_evt_visitor',
        revenue: 100,
        metadata: { plan: 'pro' },
      }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.event_id).toBeDefined()

    // Verify event recorded
    const evt = await db.query.events.findFirst({
      where: eq(events.id, body.event_id),
    })
    expect(evt).toBeDefined()
    expect(evt!.affiliateId).toBe(AFF_ID)
    expect(evt!.revenue).toBe(100)

    // Verify commission created (20% of 100 = 20)
    const comm = await db.query.commissions.findFirst({
      where: eq(commissions.eventId, body.event_id),
    })
    expect(comm).toBeDefined()
    expect(comm!.amount).toBe(20)
    expect(comm!.status).toBe('pending')
  })

  it('records event without commission when no rule matches', async () => {
    const { app } = createApp([])
    const res = await app.request('/e', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        event: 'pageview',  // sem regra cadastrada
        visitor_token: 'rk_evt_visitor',
      }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()

    const comm = await db.query.commissions.findFirst({
      where: eq(commissions.eventId, body.event_id),
    })
    expect(comm).toBeUndefined()
  })
})
