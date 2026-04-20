import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { createApp } from '../src/app'
import { db } from '../src/db'
import { eq } from 'drizzle-orm'
import { affiliates, magicLinks, program } from '../src/db/schema'
import { signJwt } from '../src/lib/jwt'

const { app } = createApp([])

let programId: string
let affiliateId: string
const testEmail = `aff-test-${Date.now()}@test.com`
const testSlug = `aff-test-${Date.now()}`

beforeAll(async () => {
  // Ensure a program exists
  let prog = await db.query.program.findFirst()
  if (!prog) {
    const id = crypto.randomUUID()
    const inserted = await db.insert(program).values({
      id,
      name: 'Affiliate Test Program',
      websiteUrl: 'https://aff-test.com',
      apiKey: crypto.randomUUID(),
    }).returning()
    prog = inserted[0]
  }
  programId = prog.id

  // Create an active affiliate
  affiliateId = crypto.randomUUID()
  await db.insert(affiliates).values({
    id: affiliateId,
    programId,
    name: 'Test Affiliate',
    email: testEmail,
    slug: testSlug,
    status: 'active',
  })
})

afterAll(async () => {
  await db.delete(magicLinks).where(eq(magicLinks.affiliateId, affiliateId))
  await db.delete(affiliates).where(eq(affiliates.id, affiliateId))
})

describe('POST /affiliate/magic-link', () => {
  it('returns ok for valid active email', async () => {
    const res = await app.request('/affiliate/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean }
    expect(body.ok).toBe(true)
  })

  it('returns ok silently for unknown email (no leak)', async () => {
    const res = await app.request('/affiliate/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'unknown@nowhere.com' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean }
    expect(body.ok).toBe(true)
  })

  it('returns 400 when email is missing', async () => {
    const res = await app.request('/affiliate/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })
})

describe('GET /affiliate/auth', () => {
  it('returns JWT for valid token', async () => {
    // Create a magic link directly in DB
    const token = crypto.randomUUID()
    await db.insert(magicLinks).values({
      id: crypto.randomUUID(),
      affiliateId,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    })

    const res = await app.request(`/affiliate/auth?token=${token}`)
    expect(res.status).toBe(200)
    const body = await res.json() as { token: string }
    expect(typeof body.token).toBe('string')
    expect(body.token.length).toBeGreaterThan(0)
  })

  it('returns 401 for already used token', async () => {
    // Create and immediately mark as used
    const token = crypto.randomUUID()
    await db.insert(magicLinks).values({
      id: crypto.randomUUID(),
      affiliateId,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      usedAt: new Date(),
    })

    const res = await app.request(`/affiliate/auth?token=${token}`)
    expect(res.status).toBe(401)
  })

  it('returns 401 for expired token', async () => {
    const token = crypto.randomUUID()
    await db.insert(magicLinks).values({
      id: crypto.randomUUID(),
      affiliateId,
      token,
      expiresAt: new Date(Date.now() - 1000), // expired 1 second ago
    })

    const res = await app.request(`/affiliate/auth?token=${token}`)
    expect(res.status).toBe(401)
  })

  it('returns 401 for unknown token', async () => {
    const res = await app.request('/affiliate/auth?token=nonexistent-token')
    expect(res.status).toBe(401)
  })
})

describe('GET /affiliate/dashboard', () => {
  it('blocks unauthenticated request (401)', async () => {
    const res = await app.request('/affiliate/dashboard')
    expect(res.status).toBe(401)
  })

  it('allows authenticated affiliate', async () => {
    const jwt = await signJwt({ sub: affiliateId, role: 'affiliate' }, '1h')
    const res = await app.request('/affiliate/dashboard', {
      headers: { Authorization: `Bearer ${jwt}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean }
    expect(body.ok).toBe(true)
  })
})
