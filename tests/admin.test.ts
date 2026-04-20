import { describe, it, expect, beforeAll, afterAll, afterEach } from 'bun:test'
import { createApp } from '../src/app'
import { db } from '../src/db'
import { adminUser } from '../src/db/schema'

async function cleanAdmin() {
  await db.delete(adminUser)
}

describe('POST /admin/setup', () => {
  afterEach(cleanAdmin)

  it('creates admin account on first call', async () => {
    const { app } = createApp([])
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
    const { app } = createApp([])
    const res = await app.request('/admin/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'short' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 403 if already set up', async () => {
    const { app } = createApp([])
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
    await cleanAdmin()
    const { app } = createApp([])
    await app.request('/admin/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'secret123' }),
    })
  })
  afterAll(cleanAdmin)

  it('returns JWT on valid credentials', async () => {
    const { app } = createApp([])
    const res = await app.request('/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'secret123' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(typeof body.token).toBe('string')
  })

  it('returns 401 on wrong password', async () => {
    const { app } = createApp([])
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
    const { app } = createApp([])
    const res = await app.request('/admin/program')
    expect(res.status).toBe(401)
  })

  it('blocks request with invalid token', async () => {
    const { app } = createApp([])
    const res = await app.request('/admin/program', {
      headers: { Authorization: 'Bearer not-a-valid-jwt' },
    })
    expect(res.status).toBe(401)
  })
})
