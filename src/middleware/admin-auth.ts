// src/middleware/admin-auth.ts
import type { MiddlewareHandler } from 'hono'
import { verifyJwt } from '../lib/jwt'

export const adminAuth: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header('authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return c.json({ error: 'Unauthorized' }, 401)

  const payload = await verifyJwt(token)
  if (!payload || payload.role !== 'admin') return c.json({ error: 'Unauthorized' }, 401)

  c.set('adminId', payload.sub as string)
  await next()
}
