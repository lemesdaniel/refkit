import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { createApp } from '../src/app'
import { db } from '../src/db'
import { eq } from 'drizzle-orm'
import { program, affiliates } from '../src/db/schema'

const { app } = createApp([])

let programId: string

beforeAll(async () => {
  // Clean up any leftover test data
  await db.delete(affiliates)
  await db.delete(program)

  // Create a program for testing
  programId = crypto.randomUUID()
  await db.insert(program).values({
    id: programId,
    name: 'Join Test Program',
    websiteUrl: 'https://jointest.com',
    apiKey: `test-api-key-${programId}`,
  })
})

afterAll(async () => {
  await db.delete(affiliates)
  await db.delete(program)
})

describe('GET /join/:program_id', () => {
  it('returns program info for valid program', async () => {
    const res = await app.request(`/join/${programId}`)
    expect(res.status).toBe(200)
    const body = await res.json() as { program: { id: string; name: string; websiteUrl: string } }
    expect(body.program.id).toBe(programId)
    expect(body.program.name).toBe('Join Test Program')
    expect(body.program.websiteUrl).toBe('https://jointest.com')
  })

  it('returns 404 for unknown program', async () => {
    const res = await app.request('/join/nonexistent-program-id')
    expect(res.status).toBe(404)
  })
})

describe('POST /join/:program_id', () => {
  it('creates affiliate with pending status', async () => {
    const res = await app.request(`/join/${programId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Jane Doe', email: 'jane@test.com', slug: 'jane-doe' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean; status: string }
    expect(body.ok).toBe(true)
    expect(body.status).toBe('pending')

    // Verify in DB
    const aff = await db.query.affiliates.findFirst({
      where: eq(affiliates.email, 'jane@test.com'),
    })
    expect(aff).toBeTruthy()
    expect(aff!.status).toBe('pending')
    expect(aff!.programId).toBe(programId)
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await app.request(`/join/${programId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Only Name' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when slug has invalid characters', async () => {
    // Uppercase
    let res = await app.request(`/join/${programId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', email: 'upper@test.com', slug: 'Invalid-Slug' }),
    })
    expect(res.status).toBe(400)

    // Spaces
    res = await app.request(`/join/${programId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', email: 'space@test.com', slug: 'has space' }),
    })
    expect(res.status).toBe(400)

    // Special chars
    res = await app.request(`/join/${programId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', email: 'special@test.com', slug: 'no@special!' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 409 when email already registered', async () => {
    const res = await app.request(`/join/${programId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Jane Again', email: 'jane@test.com', slug: 'jane-again' }),
    })
    expect(res.status).toBe(409)
  })

  it('returns 409 when slug already taken', async () => {
    const res = await app.request(`/join/${programId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Other Person', email: 'other@test.com', slug: 'jane-doe' }),
    })
    expect(res.status).toBe(409)
  })

  it('returns 404 for unknown program', async () => {
    const res = await app.request('/join/nonexistent-program-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', email: 'test@test.com', slug: 'test' }),
    })
    expect(res.status).toBe(404)
  })
})
