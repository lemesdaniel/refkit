// src/db/schema.ts
import {
  pgTable, text, real, integer, timestamp, jsonb, unique,
} from 'drizzle-orm/pg-core'

export const program = pgTable('program', {
  id:         text('id').primaryKey(),
  name:       text('name').notNull(),
  websiteUrl: text('website_url').notNull(),
  apiKey:     text('api_key').notNull().unique(),
  cookieDays: integer('cookie_days').notNull().default(30),
  createdAt:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const affiliates = pgTable('affiliates', {
  id:           text('id').primaryKey(),
  programId:    text('program_id').notNull().references(() => program.id),
  name:         text('name').notNull(),
  email:        text('email').notNull().unique(),
  slug:         text('slug').notNull().unique(),
  status:       text('status').notNull().default('pending'), // pending | active | inactive
  payoutEmail:  text('payout_email'),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const clicks = pgTable('clicks', {
  id:           text('id').primaryKey(),
  affiliateId:  text('affiliate_id').notNull().references(() => affiliates.id),
  visitorToken: text('visitor_token').notNull(),
  referrer:     text('referrer'),
  ip:           text('ip'),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const commissionRules = pgTable('commission_rules', {
  id:              text('id').primaryKey(),
  programId:       text('program_id').notNull().references(() => program.id),
  eventName:       text('event_name').notNull(),
  commissionType:  text('commission_type').notNull(), // percent | fixed
  commissionValue: real('commission_value').notNull(),
  createdAt:       timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniq: unique().on(t.programId, t.eventName),
}))

export const events = pgTable('events', {
  id:           text('id').primaryKey(),
  programId:    text('program_id').notNull().references(() => program.id),
  affiliateId:  text('affiliate_id').references(() => affiliates.id),
  visitorToken: text('visitor_token'),
  eventName:    text('event_name').notNull(),
  revenue:      real('revenue'),
  metadata:     jsonb('metadata'),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const commissions = pgTable('commissions', {
  id:          text('id').primaryKey(),
  eventId:     text('event_id').notNull().unique().references(() => events.id),
  affiliateId: text('affiliate_id').notNull().references(() => affiliates.id),
  amount:      real('amount').notNull(),
  status:      text('status').notNull().default('pending'), // pending | approved | paid
  paidAt:      timestamp('paid_at', { withTimezone: true }),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const adminUser = pgTable('admin_user', {
  id:           text('id').primaryKey(),
  email:        text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const magicLinks = pgTable('magic_links', {
  id:          text('id').primaryKey(),
  affiliateId: text('affiliate_id').notNull().references(() => affiliates.id),
  token:       text('token').notNull().unique(),
  expiresAt:   timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt:      timestamp('used_at', { withTimezone: true }),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
