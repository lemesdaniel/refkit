// src/db/migrate.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { env } from '../config'

export async function runMigrations(): Promise<void> {
  const client = postgres(env.DATABASE_URL, { max: 1 })
  const db = drizzle(client)
  await migrate(db, { migrationsFolder: './src/db/migrations' })
  await client.end()
  console.log('Migrations applied')
}

if (import.meta.main) {
  runMigrations().catch((err) => {
    console.error('Migration failed:', err)
    process.exit(1)
  })
}
