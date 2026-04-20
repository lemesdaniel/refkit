// src/app.ts
import { Hono } from 'hono'
import type { RefkitPlugin } from './plugins/types'
import { scriptRoute } from './routes/script'
import { clicksRoute } from './routes/clicks'
import { createEventsRoute } from './routes/events'
import { adminRoute } from './routes/admin'
import { affiliateRoute } from './routes/affiliate'
import { joinRoute } from './routes/join'
import { joinUiRoute } from './routes/join-ui'
import { adminUiRoute } from './routes/admin-ui'
import { affiliateUiRoute } from './routes/affiliate-ui'

export function createApp(plugins: RefkitPlugin[] = []) {
  const app = new Hono()

  for (const plugin of plugins) {
    if (plugin.onRequest) app.use('*', plugin.onRequest)
  }

  app.get('/health', (c) => c.json({ ok: true, version: '0.1.0' }))
  app.route('/refkit.js', scriptRoute)
  app.route('/click', clicksRoute)
  app.route('/e', createEventsRoute(plugins))
  app.route('/admin', adminRoute)
  app.route('/affiliate', affiliateRoute)
  app.route('/join', joinUiRoute)
  app.route('/join', joinRoute)
  app.route('/panel', adminUiRoute)
  app.route('/portal', affiliateUiRoute)

  return { app, plugins }
}
