// tests/commissions.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { calculateCommission } from '../src/modules/commissions'
import { db } from '../src/db'
import { commissionRules, program } from '../src/db/schema'
import { eq } from 'drizzle-orm'

const PROG_ID = 'test-prog-comm'

beforeAll(async () => {
  await db.insert(program).values({
    id: PROG_ID, name: 'Comm Test', websiteUrl: 'https://c.com',
    apiKey: 'key-comm', cookieDays: 30,
  }).onConflictDoNothing()

  await db.insert(commissionRules).values([
    {
      id: 'rule-percent', programId: PROG_ID,
      eventName: 'sale', commissionType: 'percent', commissionValue: 30,
    },
    {
      id: 'rule-fixed', programId: PROG_ID,
      eventName: 'trial', commissionType: 'fixed', commissionValue: 5,
    },
  ]).onConflictDoNothing()
})

afterAll(async () => {
  await db.delete(commissionRules).where(eq(commissionRules.programId, PROG_ID))
  await db.delete(program).where(eq(program.id, PROG_ID))
})

describe('calculateCommission', () => {
  it('calculates percent commission correctly', async () => {
    const amount = await calculateCommission(PROG_ID, 'sale', 100)
    expect(amount).toBe(30) // 30% de 100
  })

  it('calculates fixed commission regardless of revenue', async () => {
    const amount = await calculateCommission(PROG_ID, 'trial', null)
    expect(amount).toBe(5)
  })

  it('returns null for event with no rule', async () => {
    const amount = await calculateCommission(PROG_ID, 'unknown_event', 100)
    expect(amount).toBeNull()
  })

  it('returns null for percent commission with no revenue', async () => {
    const amount = await calculateCommission(PROG_ID, 'sale', null)
    expect(amount).toBeNull()
  })
})
