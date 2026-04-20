import type { MiddlewareHandler } from 'hono'
import { getCookie } from 'hono/cookie'
import { verifyJwt } from '../lib/jwt'

export const affiliateCookieAuth: MiddlewareHandler = async (c, next) => {
  const token = getCookie(c, 'rk_affiliate')
  if (!token) return c.redirect('/portal/login')

  const payload = await verifyJwt(token)
  if (!payload || payload.role !== 'affiliate') return c.redirect('/portal/login')

  if (!payload.sub || typeof payload.sub !== 'string') return c.redirect('/portal/login')
  c.set('affiliateId', payload.sub)
  await next()
}
