// src/modules/tracking/index.ts
import { db } from '../../db'
import { clicks, affiliates, program } from '../../db/schema'
import { eq, desc, gte, and } from 'drizzle-orm'

export async function resolveAffiliate(
  visitorToken: string,
  programId: string,
): Promise<{ affiliateId: string } | null> {
  const prog = await db.query.program.findFirst({
    where: eq(program.id, programId),
  })
  if (!prog) return null

  const cutoff = new Date(Date.now() - prog.cookieDays * 864e5)

  const result = await db
    .select({
      affiliateId: clicks.affiliateId,
      affiliateStatus: affiliates.status,
    })
    .from(clicks)
    .innerJoin(affiliates, eq(clicks.affiliateId, affiliates.id))
    .where(and(
      eq(clicks.visitorToken, visitorToken),
      gte(clicks.createdAt, cutoff),
    ))
    .orderBy(desc(clicks.createdAt))
    .limit(1)

  if (!result.length || result[0].affiliateStatus !== 'active') return null

  return { affiliateId: result[0].affiliateId }
}
