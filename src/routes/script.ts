// src/routes/script.ts
import { Hono } from 'hono'
import { readFileSync } from 'fs'

export const scriptRoute = new Hono()

// Lido uma vez no startup — serve em memória
const scriptContent = (() => {
  try {
    return readFileSync('./public/refkit.js', 'utf-8')
  } catch {
    return '// refkit.js not built — run: bun run build:script'
  }
})()

scriptRoute.get('/', (c) => {
  c.header('Content-Type', 'application/javascript; charset=utf-8')
  c.header('Cache-Control', 'public, max-age=3600')
  return c.body(scriptContent)
})
