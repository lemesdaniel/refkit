// src/index.ts
import { createApp } from './app'
import { env } from './config'
import { runMigrations } from './db/migrate'

await runMigrations()

const { app } = createApp([])

export default {
  port: env.PORT,
  fetch: app.fetch,
}

console.log(`Refkit running on http://localhost:${env.PORT}`)
