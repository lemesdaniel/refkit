// src/plugins/types.ts
import type { MiddlewareHandler } from 'hono'

export interface RefkitEvent {
  id: string
  programId: string
  affiliateId: string | null
  eventName: string
  revenue: number | null
  metadata: unknown
}

export interface RefkitAffiliate {
  id: string
  programId: string
  name: string
  email: string
  slug: string
}

export interface RefkitPlugin {
  onRequest?: MiddlewareHandler
  onEvent?: (event: RefkitEvent) => void | Promise<void>
  onAffiliateSigned?: (affiliate: RefkitAffiliate) => void | Promise<void>
}
