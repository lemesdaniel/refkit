// src/modules/commissions/index.ts
import { db } from '../../db'
import { commissionRules } from '../../db/schema'
import { and, eq } from 'drizzle-orm'

export async function calculateCommission(
  programId: string,
  eventName: string,
  revenue: number | null,
): Promise<number | null> {
  const rule = await db.query.commissionRules.findFirst({
    where: and(
      eq(commissionRules.programId, programId),
      eq(commissionRules.eventName, eventName),
    ),
  })

  if (!rule) return null

  if (rule.commissionType === 'fixed') {
    return rule.commissionValue
  }

  if (rule.commissionType === 'percent') {
    if (revenue == null) return null
    return Number(((revenue * rule.commissionValue) / 100).toFixed(2))
  }

  return null
}
