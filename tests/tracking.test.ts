// tests/tracking.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { resolveAffiliate } from '../src/modules/tracking'
import { db } from '../src/db'
import { affiliates, clicks, program } from '../src/db/schema'
import { eq } from 'drizzle-orm'

const PROG_ID = 'test-prog-tracking'
const AFF_ID = 'test-aff-tracking'

beforeAll(async () => {
  await db.insert(program).values({
    id: PROG_ID, name: 'Track Test', websiteUrl: 'https://x.com',
    apiKey: 'key-tracking', cookieDays: 30,
  }).onConflictDoNothing()

  await db.insert(affiliates).values({
    id: AFF_ID, programId: PROG_ID, name: 'Tracker', email: 'tracker@x.com',
    slug: 'tracker', status: 'active',
  }).onConflictDoNothing()

  // Click recente
  await db.insert(clicks).values({
    id: 'click-recent', affiliateId: AFF_ID,
    visitorToken: 'rk_has_click', createdAt: new Date(),
  }).onConflictDoNothing()

  // Click expirado (31 dias atrás, cookie_days=30)
  await db.insert(clicks).values({
    id: 'click-expired', affiliateId: AFF_ID,
    visitorToken: 'rk_expired',
    createdAt: new Date(Date.now() - 31 * 864e5),
  }).onConflictDoNothing()
})

afterAll(async () => {
  await db.delete(clicks).where(eq(clicks.affiliateId, AFF_ID))
  await db.delete(affiliates).where(eq(affiliates.id, AFF_ID))
  await db.delete(program).where(eq(program.id, PROG_ID))
})

describe('resolveAffiliate', () => {
  it('resolves affiliate from recent click', async () => {
    const result = await resolveAffiliate('rk_has_click', PROG_ID)
    expect(result).not.toBeNull()
    expect(result!.affiliateId).toBe(AFF_ID)
  })

  it('returns null for expired click', async () => {
    const result = await resolveAffiliate('rk_expired', PROG_ID)
    expect(result).toBeNull()
  })

  it('returns null for unknown visitor_token', async () => {
    const result = await resolveAffiliate('rk_nobody', PROG_ID)
    expect(result).toBeNull()
  })

  it('returns null for unknown program', async () => {
    const result = await resolveAffiliate('rk_has_click', 'unknown-program')
    expect(result).toBeNull()
  })
})
