import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'bun:test'
import { createApp } from '../src/app'
import { db } from '../src/db'
import { eq } from 'drizzle-orm'
import {
  adminUser,
  program,
  affiliates,
  commissionRules,
  commissions,
  events,
  magicLinks,
} from '../src/db/schema'

const { app } = createApp([])

async function cleanAll() {
  await db.delete(commissions)
  await db.delete(events)
  await db.delete(commissionRules)
  await db.delete(magicLinks)
  await db.delete(affiliates)
  await db.delete(program)
  await db.delete(adminUser)
}

async function setupAdmin() {
  await app.request('/admin/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'secret123' }),
  })
}

async function getAdminToken(): Promise<string> {
  const res = await app.request('/admin/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'secret123' }),
  })
  const body = await res.json() as { token: string }
  return body.token
}

function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

// ---- Setup / Auth tests (preserved from original) ----

describe('POST /admin/setup', () => {
  afterEach(cleanAll)

  it('creates admin account on first call', async () => {
    const res = await app.request('/admin/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'secret123' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('rejects password shorter than 8 characters', async () => {
    const res = await app.request('/admin/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'short' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 403 if already set up', async () => {
    await app.request('/admin/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'secret123' }),
    })
    const res = await app.request('/admin/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'another123' }),
    })
    expect(res.status).toBe(403)
  })
})

describe('POST /admin/auth', () => {
  beforeAll(async () => {
    await cleanAll()
    await setupAdmin()
  })
  afterAll(cleanAll)

  it('returns JWT on valid credentials', async () => {
    const res = await app.request('/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'secret123' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { token: string }
    expect(typeof body.token).toBe('string')
  })

  it('returns 401 on wrong password', async () => {
    const res = await app.request('/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'wrong' }),
    })
    expect(res.status).toBe(401)
  })
})

describe('adminAuth middleware', () => {
  it('blocks unauthenticated request to protected route', async () => {
    const res = await app.request('/admin/program')
    expect(res.status).toBe(401)
  })

  it('blocks request with invalid token', async () => {
    const res = await app.request('/admin/program', {
      headers: { Authorization: 'Bearer not-a-valid-jwt' },
    })
    expect(res.status).toBe(401)
  })
})

// ---- CRUD route tests ----

describe('Admin CRUD routes', () => {
  let token: string

  beforeAll(async () => {
    await cleanAll()
    await setupAdmin()
    token = await getAdminToken()
  })

  afterAll(cleanAll)

  describe('GET /admin/program', () => {
    it('returns null when no program exists', async () => {
      const res = await app.request('/admin/program', {
        headers: authHeaders(token),
      })
      expect(res.status).toBe(200)
      const body = await res.json() as { program: unknown }
      expect(body.program).toBeNull()
    })
  })

  describe('PUT /admin/program', () => {
    afterEach(async () => {
      await db.delete(program)
    })

    it('creates program with generated api_key', async () => {
      const res = await app.request('/admin/program', {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify({ name: 'Test Program', websiteUrl: 'https://example.com' }),
      })
      expect(res.status).toBe(200)
      const body = await res.json() as { program: { id: string; name: string; apiKey: string; cookieDays: number } }
      expect(body.program.name).toBe('Test Program')
      expect(typeof body.program.apiKey).toBe('string')
      expect(body.program.apiKey.length).toBeGreaterThan(0)
      expect(body.program.cookieDays).toBe(30)
    })

    it('updates existing program', async () => {
      // Create first
      await app.request('/admin/program', {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify({ name: 'V1', websiteUrl: 'https://v1.com' }),
      })
      // Update
      const res = await app.request('/admin/program', {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify({ name: 'V2', websiteUrl: 'https://v2.com', cookieDays: 60 }),
      })
      expect(res.status).toBe(200)
      const body = await res.json() as { program: { name: string; cookieDays: number } }
      expect(body.program.name).toBe('V2')
      expect(body.program.cookieDays).toBe(60)
    })

    it('returns 400 if name or websiteUrl missing', async () => {
      const res = await app.request('/admin/program', {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify({ name: 'Test' }),
      })
      expect(res.status).toBe(400)
    })
  })

  describe('Affiliates', () => {
    let programId: string

    beforeAll(async () => {
      // Ensure program exists for affiliate creation
      const res = await app.request('/admin/program', {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify({ name: 'Affiliate Test Prog', websiteUrl: 'https://aff.com' }),
      })
      const body = await res.json() as { program: { id: string } }
      programId = body.program.id
    })

    afterAll(async () => {
      await db.delete(magicLinks)
      await db.delete(affiliates)
      await db.delete(program)
    })

    it('GET /admin/affiliates returns empty array initially', async () => {
      const res = await app.request('/admin/affiliates', {
        headers: authHeaders(token),
      })
      expect(res.status).toBe(200)
      const body = await res.json() as { affiliates: unknown[] }
      expect(Array.isArray(body.affiliates)).toBe(true)
    })

    it('POST /admin/affiliates/invite creates active affiliate', async () => {
      const res = await app.request('/admin/affiliates/invite', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ name: 'Alice', email: 'alice@test.com', slug: 'alice' }),
      })
      expect(res.status).toBe(200)
      const body = await res.json() as { ok: boolean }
      expect(body.ok).toBe(true)

      // Verify affiliate was created with active status
      const aff = await db.query.affiliates.findFirst({
        where: eq(affiliates.email, 'alice@test.com'),
      })
      expect(aff).toBeTruthy()
      expect(aff!.status).toBe('active')
    })

    it('POST /admin/affiliates/invite returns 409 on duplicate email', async () => {
      const res = await app.request('/admin/affiliates/invite', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ name: 'Alice2', email: 'alice@test.com', slug: 'alice2' }),
      })
      expect(res.status).toBe(409)
    })

    it('POST /admin/affiliates/invite returns 409 on duplicate slug', async () => {
      const res = await app.request('/admin/affiliates/invite', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ name: 'Bob', email: 'bob@test.com', slug: 'alice' }),
      })
      expect(res.status).toBe(409)
    })

    it('PATCH /admin/affiliates/:id changes status', async () => {
      const aff = await db.query.affiliates.findFirst({
        where: eq(affiliates.email, 'alice@test.com'),
      })

      const res = await app.request(`/admin/affiliates/${aff!.id}`, {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify({ status: 'inactive' }),
      })
      expect(res.status).toBe(200)
      const body = await res.json() as { ok: boolean }
      expect(body.ok).toBe(true)

      // Verify status changed
      const updated = await db.query.affiliates.findFirst({
        where: eq(affiliates.id, aff!.id),
      })
      expect(updated!.status).toBe('inactive')
    })

    it('PATCH /admin/affiliates/:id returns 404 for unknown id', async () => {
      const res = await app.request('/admin/affiliates/nonexistent', {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify({ status: 'active' }),
      })
      expect(res.status).toBe(404)
    })

    it('PATCH /admin/affiliates/:id returns 400 for invalid status', async () => {
      const aff = await db.query.affiliates.findFirst({
        where: eq(affiliates.email, 'alice@test.com'),
      })
      const res = await app.request(`/admin/affiliates/${aff!.id}`, {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify({ status: 'banned' }),
      })
      expect(res.status).toBe(400)
    })

    it('GET /admin/affiliates returns affiliates list', async () => {
      const res = await app.request('/admin/affiliates', {
        headers: authHeaders(token),
      })
      expect(res.status).toBe(200)
      const body = await res.json() as { affiliates: unknown[] }
      expect(body.affiliates.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Commission Rules', () => {
    let programId: string

    beforeAll(async () => {
      const prog = await db.query.program.findFirst()
      if (!prog) {
        const res = await app.request('/admin/program', {
          method: 'PUT',
          headers: authHeaders(token),
          body: JSON.stringify({ name: 'Rules Test', websiteUrl: 'https://rules.com' }),
        })
        const body = await res.json() as { program: { id: string } }
        programId = body.program.id
      } else {
        programId = prog.id
      }
    })

    afterAll(async () => {
      await db.delete(commissionRules)
    })

    it('POST /admin/commission-rules creates a rule', async () => {
      const res = await app.request('/admin/commission-rules', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({
          programId,
          eventName: 'purchase',
          commissionType: 'percent',
          commissionValue: 10,
        }),
      })
      expect(res.status).toBe(200)
      const body = await res.json() as { ok: boolean }
      expect(body.ok).toBe(true)
    })

    it('POST /admin/commission-rules rejects invalid commissionType', async () => {
      const res = await app.request('/admin/commission-rules', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({
          programId,
          eventName: 'signup',
          commissionType: 'invalid',
          commissionValue: 5,
        }),
      })
      expect(res.status).toBe(400)
    })

    it('GET /admin/commission-rules returns rules array', async () => {
      const res = await app.request('/admin/commission-rules', {
        headers: authHeaders(token),
      })
      expect(res.status).toBe(200)
      const body = await res.json() as { rules: unknown[] }
      expect(Array.isArray(body.rules)).toBe(true)
      expect(body.rules.length).toBeGreaterThanOrEqual(1)
    })

    it('DELETE /admin/commission-rules/:id deletes rule', async () => {
      const rules = await db.select().from(commissionRules)
      const rule = rules[0]

      const res = await app.request(`/admin/commission-rules/${rule.id}`, {
        method: 'DELETE',
        headers: authHeaders(token),
      })
      expect(res.status).toBe(200)
      const body = await res.json() as { ok: boolean }
      expect(body.ok).toBe(true)
    })

    it('DELETE /admin/commission-rules/:id returns 404 for unknown id', async () => {
      const res = await app.request('/admin/commission-rules/nonexistent', {
        method: 'DELETE',
        headers: authHeaders(token),
      })
      expect(res.status).toBe(404)
    })
  })

  describe('Commissions', () => {
    let commissionId: string

    beforeAll(async () => {
      // Ensure program exists
      let prog = await db.query.program.findFirst()
      if (!prog) {
        const res = await app.request('/admin/program', {
          method: 'PUT',
          headers: authHeaders(token),
          body: JSON.stringify({ name: 'Comm Test', websiteUrl: 'https://comm.com' }),
        })
        const body = await res.json() as { program: { id: string } }
        prog = { id: body.program.id } as typeof prog
      }

      // Ensure affiliate exists
      let aff = await db.query.affiliates.findFirst()
      if (!aff) {
        await app.request('/admin/affiliates/invite', {
          method: 'POST',
          headers: authHeaders(token),
          body: JSON.stringify({ name: 'CommAffiliate', email: 'comm@test.com', slug: 'comm-aff' }),
        })
        aff = await db.query.affiliates.findFirst()
      }

      // Create an event directly
      const eventId = crypto.randomUUID()
      await db.insert(events).values({
        id: eventId,
        programId: prog!.id,
        affiliateId: aff!.id,
        eventName: 'purchase',
        revenue: 100,
      })

      // Create a commission directly
      commissionId = crypto.randomUUID()
      await db.insert(commissions).values({
        id: commissionId,
        eventId,
        affiliateId: aff!.id,
        amount: 10,
        status: 'pending',
      })
    })

    afterAll(async () => {
      await db.delete(commissions)
      await db.delete(events)
    })

    it('GET /admin/commissions returns commissions array', async () => {
      const res = await app.request('/admin/commissions', {
        headers: authHeaders(token),
      })
      expect(res.status).toBe(200)
      const body = await res.json() as { commissions: unknown[] }
      expect(Array.isArray(body.commissions)).toBe(true)
      expect(body.commissions.length).toBeGreaterThanOrEqual(1)
    })

    it('PATCH /admin/commissions/:id/pay marks as paid', async () => {
      const res = await app.request(`/admin/commissions/${commissionId}/pay`, {
        method: 'PATCH',
        headers: authHeaders(token),
      })
      expect(res.status).toBe(200)
      const body = await res.json() as { ok: boolean }
      expect(body.ok).toBe(true)

      // Verify it's now paid
      const updated = await db.query.commissions.findFirst({
        where: eq(commissions.id, commissionId),
      })
      expect(updated!.status).toBe('paid')
      expect(updated!.paidAt).toBeTruthy()
    })

    it('PATCH /admin/commissions/:id/pay returns 400 if already paid', async () => {
      const res = await app.request(`/admin/commissions/${commissionId}/pay`, {
        method: 'PATCH',
        headers: authHeaders(token),
      })
      expect(res.status).toBe(400)
    })

    it('PATCH /admin/commissions/:id/pay returns 404 for unknown id', async () => {
      const res = await app.request('/admin/commissions/nonexistent/pay', {
        method: 'PATCH',
        headers: authHeaders(token),
      })
      expect(res.status).toBe(404)
    })
  })

  describe('Events', () => {
    it('GET /admin/events returns events array', async () => {
      const res = await app.request('/admin/events', {
        headers: authHeaders(token),
      })
      expect(res.status).toBe(200)
      const body = await res.json() as { events: unknown[] }
      expect(Array.isArray(body.events)).toBe(true)
    })
  })
})
