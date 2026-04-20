import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { program, affiliates } from '../db/schema'
import { JoinPage } from '../views/pages/join'

export const joinUiRoute = new Hono()

// Show join form
joinUiRoute.get('/:program_id/form', async (c) => {
  const programId = c.req.param('program_id')
  const prog = await db.query.program.findFirst({ where: eq(program.id, programId) })
  if (!prog) return c.text('Program not found', 404)

  const error = c.req.query('error') || null
  return c.html(<JoinPage programName={prog.name} programId={prog.id} error={error} />)
})

// Submit join form
joinUiRoute.post('/:program_id/form', async (c) => {
  const programId = c.req.param('program_id')
  const prog = await db.query.program.findFirst({ where: eq(program.id, programId) })
  if (!prog) return c.text('Program not found', 404)

  const form = await c.req.parseBody()
  const name = form.name as string
  const email = form.email as string
  const slug = form.slug as string

  if (!name || !email || !slug) {
    return c.redirect(`/join/${programId}/form?error=All+fields+are+required`)
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return c.redirect(`/join/${programId}/form?error=Slug+must+be+lowercase+letters+numbers+and+hyphens+only`)
  }

  const existingEmail = await db.query.affiliates.findFirst({ where: eq(affiliates.email, email) })
  if (existingEmail) return c.redirect(`/join/${programId}/form?error=Email+already+registered`)

  const existingSlug = await db.query.affiliates.findFirst({ where: eq(affiliates.slug, slug) })
  if (existingSlug) return c.redirect(`/join/${programId}/form?error=Slug+already+taken`)

  await db.insert(affiliates).values({
    id: crypto.randomUUID(),
    programId,
    name,
    email,
    slug,
    status: 'pending',
  })

  return c.html(<JoinPage programName={prog.name} programId={prog.id} success={true} />)
})
