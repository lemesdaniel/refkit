// src/app.ts
import { Hono } from 'hono'
import type { RefkitPlugin } from './plugins/types'
import { scriptRoute } from './routes/script'
import { clicksRoute } from './routes/clicks'
import { createEventsRoute } from './routes/events'

export function createApp(plugins: RefkitPlugin[] = []) {
  const app = new Hono()

  for (const plugin of plugins) {
    if (plugin.onRequest) app.use('*', plugin.onRequest)
  }

  app.get('/health', (c) => c.json({ ok: true, version: '0.1.0' }))
  app.route('/refkit.js', scriptRoute)
  app.route('/click', clicksRoute)
  app.route('/e', createEventsRoute(plugins))

  return { app, plugins }
}
