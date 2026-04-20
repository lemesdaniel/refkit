// src/middleware/affiliate-auth.ts
import type { MiddlewareHandler } from 'hono'
import { verifyJwt } from '../lib/jwt'

export const affiliateAuth: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header('authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return c.json({ error: 'Unauthorized' }, 401)

  const payload = await verifyJwt(token)
  if (!payload || payload.role !== 'affiliate') return c.json({ error: 'Unauthorized' }, 401)

  if (!payload.sub || typeof payload.sub !== 'string') {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  c.set('affiliateId', payload.sub)
  await next()
}
