// tests/ui.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { createApp } from '../src/app'
import { db } from '../src/db'
import { adminUser, program } from '../src/db/schema'
import { hash } from 'bcryptjs'
import { eq } from 'drizzle-orm'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@test.com'

beforeAll(async () => {
  await db.delete(adminUser)
  await db.insert(adminUser).values({
    id: 'admin-ui-test',
    email: ADMIN_EMAIL,
    passwordHash: await hash('testpass123', 12),
  })
})

afterAll(async () => {
  await db.delete(adminUser).where(eq(adminUser.id, 'admin-ui-test'))
})

describe('Admin UI', () => {
  it('GET /panel/login returns HTML login form', async () => {
    const { app } = createApp([])
    const res = await app.request('/panel/login')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Admin Login')
    expect(html).toContain('<form')
  })

  it('POST /panel/login with correct password sets cookie and redirects', async () => {
    const { app } = createApp([])
    const res = await app.request('/panel/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'password=testpass123',
      redirect: 'manual',
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/panel')
    const setCookieHeader = res.headers.get('set-cookie') ?? ''
    expect(setCookieHeader).toContain('rk_admin=')
  })

  it('POST /panel/login with wrong password shows error', async () => {
    const { app } = createApp([])
    const res = await app.request('/panel/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'password=wrong',
    })
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Invalid password')
  })

  it('GET /panel without cookie redirects to login', async () => {
    const { app } = createApp([])
    const res = await app.request('/panel', { redirect: 'manual' })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/panel/login')
  })

  it('GET /panel with valid cookie returns dashboard HTML', async () => {
    const { app } = createApp([])
    // Login first to get cookie
    const loginRes = await app.request('/panel/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'password=testpass123',
      redirect: 'manual',
    })
    const cookie = loginRes.headers.get('set-cookie')?.split(';')[0] ?? ''

    const res = await app.request('/panel', {
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Dashboard')
  })
})

describe('Affiliate UI', () => {
  it('GET /portal/login returns HTML', async () => {
    const { app } = createApp([])
    const res = await app.request('/portal/login')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Affiliate Portal')
  })

  it('GET /portal without cookie redirects to login', async () => {
    const { app } = createApp([])
    const res = await app.request('/portal', { redirect: 'manual' })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/portal/login')
  })
})

describe('Join UI', () => {
  beforeAll(async () => {
    await db.insert(program).values({
      id: 'prog-ui-test',
      name: 'UI Test Program',
      websiteUrl: 'https://uitest.com',
      apiKey: 'key-ui-test',
      cookieDays: 30,
    }).onConflictDoNothing()
  })

  afterAll(async () => {
    await db.delete(program).where(eq(program.id, 'prog-ui-test'))
  })

  it('GET /join/:id/form returns HTML form', async () => {
    const { app } = createApp([])
    const res = await app.request('/join/prog-ui-test/form')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('UI Test Program')
    expect(html).toContain('<form')
  })

  it('GET /join/unknown/form returns 404', async () => {
    const { app } = createApp([])
    const res = await app.request('/join/unknown/form')
    expect(res.status).toBe(404)
  })
})
