// tests/script.test.ts
import { describe, it, expect } from 'bun:test'
import { createApp } from '../src/app'

describe('GET /refkit.js', () => {
  it('returns javascript with correct content-type', async () => {
    const { app } = createApp([])
    const res = await app.request('/refkit.js')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/javascript')
    const body = await res.text()
    expect(body.length).toBeGreaterThan(0)
    expect(body).toContain('rk_visitor')
  })
})
