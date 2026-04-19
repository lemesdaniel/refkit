// tests/clicks.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { createApp } from '../src/app'
import { db } from '../src/db'
import { affiliates, clicks, program } from '../src/db/schema'
import { eq } from 'drizzle-orm'

const TEST_PROGRAM_ID = 'test-prog-click'
const TEST_AFFILIATE_ID = 'test-aff-click'

beforeAll(async () => {
  await db.insert(program).values({
    id: TEST_PROGRAM_ID,
    name: 'Test Program',
    websiteUrl: 'https://example.com',
    apiKey: 'test-api-key-click',
    cookieDays: 30,
  }).onConflictDoNothing()

  await db.insert(affiliates).values({
    id: TEST_AFFILIATE_ID,
    programId: TEST_PROGRAM_ID,
    name: 'Test Affiliate',
    email: 'aff-click@example.com',
    slug: 'testclick',
    status: 'active',
  }).onConflictDoNothing()
})

afterAll(async () => {
  await db.delete(clicks).where(eq(clicks.affiliateId, TEST_AFFILIATE_ID))
  await db.delete(affiliates).where(eq(affiliates.id, TEST_AFFILIATE_ID))
  await db.delete(program).where(eq(program.id, TEST_PROGRAM_ID))
})

describe('POST /click', () => {
  it('records click for active affiliate', async () => {
    const { app } = createApp([])
    const res = await app.request('/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        program_id: TEST_PROGRAM_ID,
        slug: 'testclick',
        visitor_token: 'rk_visitor123',
        referrer: 'https://twitter.com',
      }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)

    const recorded = await db.query.clicks.findFirst({
      where: eq(clicks.visitorToken, 'rk_visitor123'),
    })
    expect(recorded).toBeDefined()
    expect(recorded!.affiliateId).toBe(TEST_AFFILIATE_ID)
  })

  it('returns 200 silently for unknown slug', async () => {
    const { app } = createApp([])
    const res = await app.request('/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        program_id: TEST_PROGRAM_ID,
        slug: 'unknown-slug',
        visitor_token: 'rk_visitor_unknown',
      }),
    })
    expect(res.status).toBe(200)
  })

  it('returns 200 silently for missing body fields', async () => {
    const { app } = createApp([])
    const res = await app.request('/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(200)
  })
})
