import type { MiddlewareHandler } from 'hono'
import { getCookie } from 'hono/cookie'
import { verifyJwt } from '../lib/jwt'

export const adminCookieAuth: MiddlewareHandler = async (c, next) => {
  const token = getCookie(c, 'rk_admin')
  if (!token) return c.redirect('/panel/login')

  const payload = await verifyJwt(token)
  if (!payload || payload.role !== 'admin') return c.redirect('/panel/login')

  if (!payload.sub || typeof payload.sub !== 'string') return c.redirect('/panel/login')
  c.set('adminId', payload.sub)
  await next()
}
