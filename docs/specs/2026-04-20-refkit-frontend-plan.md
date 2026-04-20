# Refkit Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add server-rendered HTML UI for admin panel, affiliate portal, and join page using Hono JSX + Pico CSS.

**Architecture:** Hono JSX renders HTML server-side. Auth via HttpOnly cookies (same JWTs, read from cookie instead of header). All actions via form POST + redirect. Pico CSS via CDN (classless). No client JavaScript.

**Tech Stack:** Hono 4.x JSX, Pico CSS 2 (CDN), Bun

---

## File Structure

```
src/
├── views/
│   ├── layout.tsx              # HTML shell with Pico CSS, nav
│   ├── components/
│   │   ├── data-table.tsx      # Generic table component
│   │   ├── badge.tsx           # Status badge (colored <mark>)
│   │   ├── form-field.tsx      # Label + input + error
│   │   └── alert.tsx           # Success/error message
│   └── pages/
│       ├── admin/
│       │   ├── login.tsx       # Password form
│       │   ├── dashboard.tsx   # Summary cards + recent events
│       │   ├── program.tsx     # Program config form
│       │   ├── affiliates.tsx  # Table + invite form
│       │   ├── rules.tsx       # Table + create form
│       │   ├── commissions.tsx # Table + pay button
│       │   └── events.tsx      # Events log table
│       ├── affiliate/
│       │   ├── login.tsx       # Email form + "check email" state
│       │   ├── dashboard.tsx   # Stats + commissions table
│       │   └── payout.tsx      # Payout email form
│       └── join.tsx            # Public signup form
├── middleware/
│   ├── admin-cookie-auth.ts    # Reads rk_admin cookie
│   └── affiliate-cookie-auth.ts # Reads rk_affiliate cookie
├── routes/
│   ├── admin-ui.ts             # GET/POST /panel/*
│   ├── affiliate-ui.ts         # GET/POST /portal/*
│   └── join-ui.ts              # GET/POST /join/:id/form
├── app.ts                      # Modify: register UI routes
tsconfig.json                   # Modify: add JSX config
```

---

### Task 1: Setup — tsconfig JSX + layout + Pico CSS

**Files:**
- Modify: `tsconfig.json`
- Create: `src/views/layout.tsx`
- Create: `src/views/components/alert.tsx`

- [ ] **Step 1: Update tsconfig.json for JSX**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "baseUrl": ".",
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx"
  },
  "include": ["src/**/*", "scripts/**/*"],
  "exclude": ["src-script", "node_modules", "public"]
}
```

- [ ] **Step 2: Create `src/views/layout.tsx`**

```tsx
import type { Child } from 'hono/jsx'

type Props = {
  title: string
  nav?: 'admin' | 'affiliate' | null
  children: Child
  success?: string | null
  error?: string | null
}

export function Layout({ title, nav, children, success, error }: Props) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css" />
        <title>{title} — Refkit</title>
      </head>
      <body>
        {nav === 'admin' && (
          <nav class="container">
            <ul>
              <li><strong>Refkit Admin</strong></li>
            </ul>
            <ul>
              <li><a href="/panel">Dashboard</a></li>
              <li><a href="/panel/affiliates">Affiliates</a></li>
              <li><a href="/panel/rules">Rules</a></li>
              <li><a href="/panel/commissions">Commissions</a></li>
              <li><a href="/panel/events">Events</a></li>
              <li><a href="/panel/program">Program</a></li>
            </ul>
            <ul>
              <li>
                <form method="post" action="/panel/logout" style="margin:0">
                  <button type="submit" class="outline secondary" style="padding:0.3rem 0.8rem">Logout</button>
                </form>
              </li>
            </ul>
          </nav>
        )}
        {nav === 'affiliate' && (
          <nav class="container">
            <ul>
              <li><strong>Refkit Portal</strong></li>
            </ul>
            <ul>
              <li><a href="/portal">Dashboard</a></li>
              <li><a href="/portal/payout">Payout</a></li>
            </ul>
            <ul>
              <li>
                <form method="post" action="/portal/logout" style="margin:0">
                  <button type="submit" class="outline secondary" style="padding:0.3rem 0.8rem">Logout</button>
                </form>
              </li>
            </ul>
          </nav>
        )}
        <main class="container">
          {success && <article style="background:var(--pico-ins-color);padding:0.5rem 1rem;margin-bottom:1rem">{success}</article>}
          {error && <article style="background:var(--pico-del-color);padding:0.5rem 1rem;margin-bottom:1rem">{error}</article>}
          {children}
        </main>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Create `src/views/components/alert.tsx`**

```tsx
type Props = {
  type: 'success' | 'error'
  message: string
}

export function Alert({ type, message }: Props) {
  const bg = type === 'success' ? 'var(--pico-ins-color)' : 'var(--pico-del-color)'
  return <article style={`background:${bg};padding:0.5rem 1rem;margin-bottom:1rem`}>{message}</article>
}
```

- [ ] **Step 4: Verify JSX compiles**

```bash
cd /Users/daniellemes/projetos/pessoal/refkit/refkit && bunx tsc --noEmit src/views/layout.tsx
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add tsconfig.json src/views/
git commit -m "feat(ui): setup Hono JSX + Pico CSS layout"
```

---

### Task 2: Shared components — DataTable, Badge, FormField

**Files:**
- Create: `src/views/components/data-table.tsx`
- Create: `src/views/components/badge.tsx`
- Create: `src/views/components/form-field.tsx`

- [ ] **Step 1: Create `src/views/components/data-table.tsx`**

```tsx
import type { Child } from 'hono/jsx'

type Column<T> = {
  key: keyof T & string
  label: string
  render?: (value: T[keyof T], row: T) => Child
}

type Props<T> = {
  columns: Column<T>[]
  rows: T[]
  actions?: (row: T) => Child
}

export function DataTable<T extends Record<string, unknown>>({ columns, rows, actions }: Props<T>) {
  return (
    <figure>
      <table>
        <thead>
          <tr>
            {columns.map(col => <th>{col.label}</th>)}
            {actions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length + (actions ? 1 : 0)}>No data</td></tr>
          ) : (
            rows.map(row => (
              <tr>
                {columns.map(col => (
                  <td>{col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '—')}</td>
                ))}
                {actions && <td>{actions(row)}</td>}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </figure>
  )
}
```

- [ ] **Step 2: Create `src/views/components/badge.tsx`**

```tsx
const styles: Record<string, string> = {
  pending: 'background:#fff3cd;color:#856404;padding:0.1rem 0.5rem;border-radius:4px;font-size:0.85em',
  active: 'background:#d4edda;color:#155724;padding:0.1rem 0.5rem;border-radius:4px;font-size:0.85em',
  paid: 'background:#d4edda;color:#155724;padding:0.1rem 0.5rem;border-radius:4px;font-size:0.85em',
  inactive: 'background:#e2e3e5;color:#383d41;padding:0.1rem 0.5rem;border-radius:4px;font-size:0.85em',
  approved: 'background:#d4edda;color:#155724;padding:0.1rem 0.5rem;border-radius:4px;font-size:0.85em',
}

export function Badge({ status }: { status: string }) {
  const style = styles[status] ?? styles.inactive
  return <span style={style}>{status}</span>
}
```

- [ ] **Step 3: Create `src/views/components/form-field.tsx`**

```tsx
type Props = {
  label: string
  name: string
  type?: string
  value?: string
  required?: boolean
  error?: string
  placeholder?: string
  readonly?: boolean
}

export function FormField({ label, name, type = 'text', value, required, error, placeholder, readonly }: Props) {
  return (
    <label>
      {label}
      <input
        type={type}
        name={name}
        value={value}
        required={required}
        placeholder={placeholder}
        readOnly={readonly}
        {...(error ? { 'aria-invalid': 'true' } : {})}
      />
      {error && <small style="color:var(--pico-del-color)">{error}</small>}
    </label>
  )
}
```

- [ ] **Step 4: Verify all components compile**

```bash
cd /Users/daniellemes/projetos/pessoal/refkit/refkit && bunx tsc --noEmit src/views/components/*.tsx
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/views/components/
git commit -m "feat(ui): add shared components — DataTable, Badge, FormField"
```

---

### Task 3: Cookie auth middleware

**Files:**
- Create: `src/middleware/admin-cookie-auth.ts`
- Create: `src/middleware/affiliate-cookie-auth.ts`

- [ ] **Step 1: Create `src/middleware/admin-cookie-auth.ts`**

```typescript
import type { MiddlewareHandler } from 'hono'
import { getCookie } from 'hono/cookie'
import { verifyJwt } from '../lib/jwt'

export const adminCookieAuth: MiddlewareHandler = async (c, next) => {
  const token = getCookie(c, 'rk_admin')
  if (!token) return c.redirect('/panel/login')

  const payload = await verifyJwt(token)
  if (!payload || payload.role !== 'admin') return c.redirect('/panel/login')

  if (!payload.sub || typeof payload.sub !== 'string') return c.redirect('/panel/login')
  c.set('adminId', payload.sub)
  await next()
}
```

- [ ] **Step 2: Create `src/middleware/affiliate-cookie-auth.ts`**

```typescript
import type { MiddlewareHandler } from 'hono'
import { getCookie } from 'hono/cookie'
import { verifyJwt } from '../lib/jwt'

export const affiliateCookieAuth: MiddlewareHandler = async (c, next) => {
  const token = getCookie(c, 'rk_affiliate')
  if (!token) return c.redirect('/portal/login')

  const payload = await verifyJwt(token)
  if (!payload || payload.role !== 'affiliate') return c.redirect('/portal/login')

  if (!payload.sub || typeof payload.sub !== 'string') return c.redirect('/portal/login')
  c.set('affiliateId', payload.sub)
  await next()
}
```

- [ ] **Step 3: Commit**

```bash
git add src/middleware/admin-cookie-auth.ts src/middleware/affiliate-cookie-auth.ts
git commit -m "feat(ui): cookie-based auth middleware for admin and affiliate"
```

---

### Task 4: Admin UI — login, logout, dashboard

**Files:**
- Create: `src/views/pages/admin/login.tsx`
- Create: `src/views/pages/admin/dashboard.tsx`
- Create: `src/routes/admin-ui.ts`
- Modify: `src/app.ts`

- [ ] **Step 1: Create `src/views/pages/admin/login.tsx`**

```tsx
import { Layout } from '../../layout'

export function AdminLoginPage({ error }: { error?: string }) {
  return (
    <Layout title="Admin Login" nav={null} error={error}>
      <article>
        <header><h2>Admin Login</h2></header>
        <form method="post" action="/panel/login">
          <label>
            Password
            <input type="password" name="password" required autofocus />
          </label>
          <button type="submit">Login</button>
        </form>
      </article>
    </Layout>
  )
}
```

- [ ] **Step 2: Create `src/views/pages/admin/dashboard.tsx`**

```tsx
import { Layout } from '../../layout'

type Props = {
  totalAffiliates: number
  recentEventsCount: number
  pendingCommissionsTotal: number
  recentEvents: { id: string; eventName: string; affiliateId: string | null; revenue: number | null; createdAt: Date }[]
  success?: string | null
}

export function AdminDashboardPage({ totalAffiliates, recentEventsCount, pendingCommissionsTotal, recentEvents, success }: Props) {
  return (
    <Layout title="Dashboard" nav="admin" success={success}>
      <h2>Dashboard</h2>
      <div class="grid">
        <article>
          <header>Active Affiliates</header>
          <p style="font-size:2rem;font-weight:bold">{totalAffiliates}</p>
        </article>
        <article>
          <header>Events (24h)</header>
          <p style="font-size:2rem;font-weight:bold">{recentEventsCount}</p>
        </article>
        <article>
          <header>Pending Commissions</header>
          <p style="font-size:2rem;font-weight:bold">${pendingCommissionsTotal.toFixed(2)}</p>
        </article>
      </div>
      <h3>Recent Events</h3>
      <figure>
        <table>
          <thead><tr><th>Event</th><th>Affiliate</th><th>Revenue</th><th>Date</th></tr></thead>
          <tbody>
            {recentEvents.length === 0 ? (
              <tr><td colSpan={4}>No events yet</td></tr>
            ) : recentEvents.map(e => (
              <tr>
                <td>{e.eventName}</td>
                <td>{e.affiliateId ?? '—'}</td>
                <td>{e.revenue != null ? `$${e.revenue.toFixed(2)}` : '—'}</td>
                <td>{new Date(e.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figure>
    </Layout>
  )
}
```

- [ ] **Step 3: Create `src/routes/admin-ui.ts`**

```typescript
import { Hono } from 'hono'
import { setCookie, deleteCookie } from 'hono/cookie'
import { compare } from 'bcryptjs'
import { eq, desc, and, gte, sql } from 'drizzle-orm'
import { db } from '../db'
import { adminUser, affiliates, events, commissions } from '../db/schema'
import { signJwt } from '../lib/jwt'
import { adminCookieAuth } from '../middleware/admin-cookie-auth'
import { env } from '../config'
import { AdminLoginPage } from '../views/pages/admin/login'
import { AdminDashboardPage } from '../views/pages/admin/dashboard'

export const adminUiRoute = new Hono()

// Login page
adminUiRoute.get('/login', (c) => {
  return c.html(<AdminLoginPage />)
})

// Login action
adminUiRoute.post('/login', async (c) => {
  const form = await c.req.parseBody()
  const password = form.password as string

  if (!password) {
    return c.html(<AdminLoginPage error="Password required" />)
  }

  const admin = await db.query.adminUser.findFirst({
    where: eq(adminUser.email, env.ADMIN_EMAIL),
  })
  if (!admin) {
    return c.html(<AdminLoginPage error="Not set up. Use the API to run /admin/setup first." />)
  }

  const valid = await compare(password, admin.passwordHash)
  if (!valid) {
    return c.html(<AdminLoginPage error="Invalid password" />)
  }

  const token = await signJwt({ sub: admin.id, role: 'admin' }, '30d')
  setCookie(c, 'rk_admin', token, {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  })
  return c.redirect('/panel')
})

// Logout
adminUiRoute.post('/logout', (c) => {
  deleteCookie(c, 'rk_admin', { path: '/' })
  return c.redirect('/panel/login')
})

// Dashboard
adminUiRoute.get('/', adminCookieAuth, async (c) => {
  const success = c.req.query('success') || null

  const totalAffiliates = await db
    .select({ count: sql<number>`count(*)` })
    .from(affiliates)
    .where(eq(affiliates.status, 'active'))

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const recentEventsCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(events)
    .where(gte(events.createdAt, yesterday))

  const pendingTotal = await db
    .select({ total: sql<number>`coalesce(sum(${commissions.amount}), 0)` })
    .from(commissions)
    .where(eq(commissions.status, 'pending'))

  const recentEvents = await db
    .select()
    .from(events)
    .orderBy(desc(events.createdAt))
    .limit(5)

  return c.html(
    <AdminDashboardPage
      totalAffiliates={Number(totalAffiliates[0].count)}
      recentEventsCount={Number(recentEventsCount[0].count)}
      pendingCommissionsTotal={Number(pendingTotal[0].total)}
      recentEvents={recentEvents}
      success={success}
    />
  )
})
```

- [ ] **Step 4: Register route in `src/app.ts`**

Add import and registration:
```typescript
import { adminUiRoute } from './routes/admin-ui'
// in createApp:
app.route('/panel', adminUiRoute)
```

- [ ] **Step 5: Test manually — start dev and visit /panel/login**

```bash
cd /Users/daniellemes/projetos/pessoal/refkit/refkit && bun run dev &
sleep 2
curl -s http://localhost:3000/panel/login | head -5
kill %1
```

Expected: HTML with `<h2>Admin Login</h2>`

- [ ] **Step 6: Commit**

```bash
git add src/views/pages/admin/login.tsx src/views/pages/admin/dashboard.tsx src/routes/admin-ui.ts src/app.ts
git commit -m "feat(ui): admin login + dashboard pages"
```

---

### Task 5: Admin UI — program page

**Files:**
- Create: `src/views/pages/admin/program.tsx`
- Modify: `src/routes/admin-ui.ts`

- [ ] **Step 1: Create `src/views/pages/admin/program.tsx`**

```tsx
import { Layout } from '../../layout'
import { FormField } from '../../components/form-field'

type ProgramData = {
  id: string
  name: string
  websiteUrl: string
  apiKey: string
  cookieDays: number
} | null

type Props = {
  program: ProgramData
  success?: string | null
  error?: string | null
}

export function AdminProgramPage({ program, success, error }: Props) {
  return (
    <Layout title="Program" nav="admin" success={success} error={error}>
      <h2>Program Configuration</h2>
      <form method="post" action="/panel/program">
        <FormField label="Name" name="name" value={program?.name ?? ''} required />
        <FormField label="Website URL" name="websiteUrl" value={program?.websiteUrl ?? ''} required placeholder="https://yoursite.com" />
        <FormField label="Cookie Days" name="cookieDays" type="number" value={String(program?.cookieDays ?? 30)} required />
        <button type="submit">{program ? 'Update' : 'Create'} Program</button>
      </form>
      {program && (
        <article>
          <header>API Key</header>
          <code style="word-break:break-all">{program.apiKey}</code>
          <p><small>Use this key in your backend to report events via POST /e</small></p>
        </article>
      )}
      {program && (
        <article>
          <header>Script Tag</header>
          <code style="word-break:break-all">&lt;script src="{`${'{BASE_URL}'}/refkit.js`}" data-program="{program.id}"&gt;&lt;/script&gt;</code>
        </article>
      )}
    </Layout>
  )
}
```

- [ ] **Step 2: Add routes to `src/routes/admin-ui.ts`**

Add these after the dashboard route:

```typescript
import { AdminProgramPage } from '../views/pages/admin/program'
import { program } from '../db/schema'

// Program page
adminUiRoute.get('/program', adminCookieAuth, async (c) => {
  const success = c.req.query('success') || null
  const error = c.req.query('error') || null
  const prog = await db.query.program.findFirst()
  return c.html(<AdminProgramPage program={prog ?? null} success={success} error={error} />)
})

// Program save
adminUiRoute.post('/program', adminCookieAuth, async (c) => {
  const form = await c.req.parseBody()
  const name = form.name as string
  const websiteUrl = form.websiteUrl as string
  const cookieDays = parseInt(form.cookieDays as string, 10) || 30

  if (!name || !websiteUrl) {
    return c.redirect('/panel/program?error=Name+and+URL+are+required')
  }

  const existing = await db.query.program.findFirst()
  if (existing) {
    await db.update(program).set({ name, websiteUrl, cookieDays }).where(eq(program.id, existing.id))
  } else {
    await db.insert(program).values({
      id: crypto.randomUUID(),
      name,
      websiteUrl,
      apiKey: crypto.randomUUID(),
      cookieDays,
    })
  }

  return c.redirect('/panel/program?success=Program+saved')
})
```

- [ ] **Step 3: Commit**

```bash
git add src/views/pages/admin/program.tsx src/routes/admin-ui.ts
git commit -m "feat(ui): admin program config page"
```

---

### Task 6: Admin UI — affiliates page

**Files:**
- Create: `src/views/pages/admin/affiliates.tsx`
- Modify: `src/routes/admin-ui.ts`

- [ ] **Step 1: Create `src/views/pages/admin/affiliates.tsx`**

```tsx
import { Layout } from '../../layout'
import { Badge } from '../../components/badge'
import { FormField } from '../../components/form-field'

type Affiliate = {
  id: string
  name: string
  email: string
  slug: string
  status: string
  createdAt: Date
}

type Props = {
  affiliates: Affiliate[]
  success?: string | null
  error?: string | null
}

export function AdminAffiliatesPage({ affiliates, success, error }: Props) {
  return (
    <Layout title="Affiliates" nav="admin" success={success} error={error}>
      <h2>Affiliates</h2>

      <figure>
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Slug</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {affiliates.length === 0 ? (
              <tr><td colSpan={5}>No affiliates yet</td></tr>
            ) : affiliates.map(a => (
              <tr>
                <td>{a.name}</td>
                <td>{a.email}</td>
                <td><code>{a.slug}</code></td>
                <td><Badge status={a.status} /></td>
                <td>
                  {a.status !== 'active' && (
                    <form method="post" action={`/panel/affiliates/${a.id}/status`} style="display:inline">
                      <input type="hidden" name="status" value="active" />
                      <button type="submit" class="outline" style="padding:0.2rem 0.5rem;font-size:0.8em">Activate</button>
                    </form>
                  )}
                  {a.status === 'active' && (
                    <form method="post" action={`/panel/affiliates/${a.id}/status`} style="display:inline">
                      <input type="hidden" name="status" value="inactive" />
                      <button type="submit" class="outline secondary" style="padding:0.2rem 0.5rem;font-size:0.8em">Deactivate</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </figure>

      <details>
        <summary>Invite New Affiliate</summary>
        <form method="post" action="/panel/affiliates/invite">
          <div class="grid">
            <FormField label="Name" name="name" required />
            <FormField label="Email" name="email" type="email" required />
            <FormField label="Slug" name="slug" required placeholder="e.g. daniel" />
          </div>
          <button type="submit">Send Invite</button>
        </form>
      </details>
    </Layout>
  )
}
```

- [ ] **Step 2: Add routes to `src/routes/admin-ui.ts`**

```typescript
import { AdminAffiliatesPage } from '../views/pages/admin/affiliates'
import { magicLinks } from '../db/schema'
import { sendEmail } from '../lib/email'

// Affiliates list
adminUiRoute.get('/affiliates', adminCookieAuth, async (c) => {
  const success = c.req.query('success') || null
  const error = c.req.query('error') || null
  const list = await db.select().from(affiliates).orderBy(desc(affiliates.createdAt))
  return c.html(<AdminAffiliatesPage affiliates={list} success={success} error={error} />)
})

// Change status
adminUiRoute.post('/affiliates/:id/status', adminCookieAuth, async (c) => {
  const { id } = c.req.param()
  const form = await c.req.parseBody()
  const status = form.status as string

  if (!['active', 'inactive', 'pending'].includes(status)) {
    return c.redirect('/panel/affiliates?error=Invalid+status')
  }

  const existing = await db.query.affiliates.findFirst({ where: eq(affiliates.id, id) })
  if (!existing) return c.redirect('/panel/affiliates?error=Affiliate+not+found')

  await db.update(affiliates).set({ status }).where(eq(affiliates.id, id))
  return c.redirect('/panel/affiliates?success=Status+updated')
})

// Invite
adminUiRoute.post('/affiliates/invite', adminCookieAuth, async (c) => {
  const form = await c.req.parseBody()
  const name = form.name as string
  const email = form.email as string
  const slug = form.slug as string

  if (!name || !email || !slug) {
    return c.redirect('/panel/affiliates?error=All+fields+required')
  }

  const prog = await db.query.program.findFirst()
  if (!prog) return c.redirect('/panel/affiliates?error=Program+not+configured')

  const existingEmail = await db.query.affiliates.findFirst({ where: eq(affiliates.email, email) })
  if (existingEmail) return c.redirect('/panel/affiliates?error=Email+already+in+use')

  const existingSlug = await db.query.affiliates.findFirst({ where: eq(affiliates.slug, slug) })
  if (existingSlug) return c.redirect('/panel/affiliates?error=Slug+already+in+use')

  const affiliateId = crypto.randomUUID()
  await db.insert(affiliates).values({
    id: affiliateId,
    programId: prog.id,
    name,
    email,
    slug,
    status: 'active',
  })

  const token = crypto.randomUUID()
  await db.insert(magicLinks).values({
    id: crypto.randomUUID(),
    affiliateId,
    token,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  })

  const magicUrl = `${env.BASE_URL}/portal/auth?token=${token}`
  try {
    await sendEmail(email, 'Welcome to the affiliate program!',
      `<p>Hi ${name},</p><p>You've been invited! <a href="${magicUrl}">Access your dashboard</a></p>`)
  } catch (err) {
    console.warn('[EMAIL ERROR]', err)
  }

  return c.redirect('/panel/affiliates?success=Affiliate+invited')
})
```

- [ ] **Step 3: Commit**

```bash
git add src/views/pages/admin/affiliates.tsx src/routes/admin-ui.ts
git commit -m "feat(ui): admin affiliates page with invite + status actions"
```

---

### Task 7: Admin UI — rules, commissions, events pages

**Files:**
- Create: `src/views/pages/admin/rules.tsx`
- Create: `src/views/pages/admin/commissions.tsx`
- Create: `src/views/pages/admin/events.tsx`
- Modify: `src/routes/admin-ui.ts`

- [ ] **Step 1: Create `src/views/pages/admin/rules.tsx`**

```tsx
import { Layout } from '../../layout'
import { FormField } from '../../components/form-field'

type Rule = {
  id: string
  eventName: string
  commissionType: string
  commissionValue: number
}

type Props = {
  rules: Rule[]
  programId: string | null
  success?: string | null
  error?: string | null
}

export function AdminRulesPage({ rules, programId, success, error }: Props) {
  return (
    <Layout title="Commission Rules" nav="admin" success={success} error={error}>
      <h2>Commission Rules</h2>

      <figure>
        <table>
          <thead><tr><th>Event</th><th>Type</th><th>Value</th><th>Actions</th></tr></thead>
          <tbody>
            {rules.length === 0 ? (
              <tr><td colSpan={4}>No rules configured</td></tr>
            ) : rules.map(r => (
              <tr>
                <td><code>{r.eventName}</code></td>
                <td>{r.commissionType}</td>
                <td>{r.commissionType === 'percent' ? `${r.commissionValue}%` : `$${r.commissionValue}`}</td>
                <td>
                  <form method="post" action={`/panel/rules/${r.id}/delete`} style="display:inline">
                    <button type="submit" class="outline secondary" style="padding:0.2rem 0.5rem;font-size:0.8em">Delete</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </figure>

      {programId ? (
        <details>
          <summary>Add New Rule</summary>
          <form method="post" action="/panel/rules">
            <input type="hidden" name="programId" value={programId} />
            <div class="grid">
              <FormField label="Event Name" name="eventName" required placeholder="e.g. sale, trial, upgrade" />
              <label>
                Type
                <select name="commissionType" required>
                  <option value="percent">Percent</option>
                  <option value="fixed">Fixed</option>
                </select>
              </label>
              <FormField label="Value" name="commissionValue" type="number" required placeholder="e.g. 30" />
            </div>
            <button type="submit">Create Rule</button>
          </form>
        </details>
      ) : (
        <p><em>Configure your program first to add rules.</em></p>
      )}
    </Layout>
  )
}
```

- [ ] **Step 2: Create `src/views/pages/admin/commissions.tsx`**

```tsx
import { Layout } from '../../layout'
import { Badge } from '../../components/badge'

type Commission = {
  id: string
  affiliateId: string
  amount: number
  status: string
  createdAt: Date
}

type Props = {
  commissions: Commission[]
  success?: string | null
  error?: string | null
}

export function AdminCommissionsPage({ commissions, success, error }: Props) {
  return (
    <Layout title="Commissions" nav="admin" success={success} error={error}>
      <h2>Commissions</h2>
      <figure>
        <table>
          <thead><tr><th>Affiliate</th><th>Amount</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            {commissions.length === 0 ? (
              <tr><td colSpan={5}>No commissions yet</td></tr>
            ) : commissions.map(cm => (
              <tr>
                <td><code>{cm.affiliateId.slice(0, 8)}...</code></td>
                <td>${cm.amount.toFixed(2)}</td>
                <td><Badge status={cm.status} /></td>
                <td>{new Date(cm.createdAt).toLocaleDateString()}</td>
                <td>
                  {cm.status === 'pending' && (
                    <form method="post" action={`/panel/commissions/${cm.id}/pay`} style="display:inline">
                      <button type="submit" class="outline" style="padding:0.2rem 0.5rem;font-size:0.8em">Mark Paid</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </figure>
    </Layout>
  )
}
```

- [ ] **Step 3: Create `src/views/pages/admin/events.tsx`**

```tsx
import { Layout } from '../../layout'

type Event = {
  id: string
  eventName: string
  affiliateId: string | null
  revenue: number | null
  metadata: unknown
  createdAt: Date
}

type Props = {
  events: Event[]
}

export function AdminEventsPage({ events }: Props) {
  return (
    <Layout title="Events" nav="admin">
      <h2>Events</h2>
      <figure>
        <table>
          <thead><tr><th>Event</th><th>Affiliate</th><th>Revenue</th><th>Metadata</th><th>Date</th></tr></thead>
          <tbody>
            {events.length === 0 ? (
              <tr><td colSpan={5}>No events yet</td></tr>
            ) : events.map(e => (
              <tr>
                <td><code>{e.eventName}</code></td>
                <td>{e.affiliateId ? <code>{e.affiliateId.slice(0, 8)}...</code> : '—'}</td>
                <td>{e.revenue != null ? `$${e.revenue.toFixed(2)}` : '—'}</td>
                <td><small>{e.metadata ? JSON.stringify(e.metadata).slice(0, 50) : '—'}</small></td>
                <td>{new Date(e.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figure>
    </Layout>
  )
}
```

- [ ] **Step 4: Add routes to `src/routes/admin-ui.ts`**

```typescript
import { AdminRulesPage } from '../views/pages/admin/rules'
import { AdminCommissionsPage } from '../views/pages/admin/commissions'
import { AdminEventsPage } from '../views/pages/admin/events'
import { commissionRules } from '../db/schema'

// Rules
adminUiRoute.get('/rules', adminCookieAuth, async (c) => {
  const success = c.req.query('success') || null
  const error = c.req.query('error') || null
  const prog = await db.query.program.findFirst()
  const rules = await db.select().from(commissionRules)
  return c.html(<AdminRulesPage rules={rules} programId={prog?.id ?? null} success={success} error={error} />)
})

adminUiRoute.post('/rules', adminCookieAuth, async (c) => {
  const form = await c.req.parseBody()
  const programId = form.programId as string
  const eventName = form.eventName as string
  const commissionType = form.commissionType as string
  const commissionValue = parseFloat(form.commissionValue as string)

  if (!programId || !eventName || !commissionType || isNaN(commissionValue)) {
    return c.redirect('/panel/rules?error=All+fields+required')
  }

  await db.insert(commissionRules).values({
    id: crypto.randomUUID(),
    programId,
    eventName,
    commissionType,
    commissionValue,
  })
  return c.redirect('/panel/rules?success=Rule+created')
})

adminUiRoute.post('/rules/:id/delete', adminCookieAuth, async (c) => {
  const { id } = c.req.param()
  await db.delete(commissionRules).where(eq(commissionRules.id, id))
  return c.redirect('/panel/rules?success=Rule+deleted')
})

// Commissions
adminUiRoute.get('/commissions', adminCookieAuth, async (c) => {
  const success = c.req.query('success') || null
  const error = c.req.query('error') || null
  const list = await db.select().from(commissions).orderBy(desc(commissions.createdAt)).limit(100)
  return c.html(<AdminCommissionsPage commissions={list} success={success} error={error} />)
})

adminUiRoute.post('/commissions/:id/pay', adminCookieAuth, async (c) => {
  const { id } = c.req.param()
  const existing = await db.query.commissions.findFirst({ where: eq(commissions.id, id) })
  if (!existing) return c.redirect('/panel/commissions?error=Not+found')
  if (existing.status === 'paid') return c.redirect('/panel/commissions?error=Already+paid')

  await db.update(commissions).set({ status: 'paid', paidAt: new Date() }).where(eq(commissions.id, id))
  return c.redirect('/panel/commissions?success=Commission+marked+as+paid')
})

// Events
adminUiRoute.get('/events', adminCookieAuth, async (c) => {
  const list = await db.select().from(events).orderBy(desc(events.createdAt)).limit(100)
  return c.html(<AdminEventsPage events={list} />)
})
```

- [ ] **Step 5: Commit**

```bash
git add src/views/pages/admin/rules.tsx src/views/pages/admin/commissions.tsx src/views/pages/admin/events.tsx src/routes/admin-ui.ts
git commit -m "feat(ui): admin rules, commissions, and events pages"
```

---

### Task 8: Affiliate UI — login, auth, dashboard, payout

**Files:**
- Create: `src/views/pages/affiliate/login.tsx`
- Create: `src/views/pages/affiliate/dashboard.tsx`
- Create: `src/views/pages/affiliate/payout.tsx`
- Create: `src/routes/affiliate-ui.ts`
- Modify: `src/app.ts`

- [ ] **Step 1: Create `src/views/pages/affiliate/login.tsx`**

```tsx
import { Layout } from '../../layout'

export function AffiliateLoginPage({ error, sent }: { error?: string; sent?: boolean }) {
  return (
    <Layout title="Affiliate Login" nav={null} error={error}>
      <article>
        <header><h2>Affiliate Portal</h2></header>
        {sent ? (
          <p>Check your email for a login link. It expires in 1 hour.</p>
        ) : (
          <form method="post" action="/portal/login">
            <label>
              Email
              <input type="email" name="email" required autofocus placeholder="your@email.com" />
            </label>
            <button type="submit">Send Login Link</button>
          </form>
        )}
      </article>
    </Layout>
  )
}
```

- [ ] **Step 2: Create `src/views/pages/affiliate/dashboard.tsx`**

```tsx
import { Layout } from '../../layout'
import { Badge } from '../../components/badge'

type Props = {
  affiliate: { name: string; slug: string; email: string }
  stats: { totalPending: number; totalPaid: number; clickCount: number }
  commissions: { id: string; amount: number; status: string; createdAt: Date }[]
  baseUrl: string
  success?: string | null
}

export function AffiliateDashboardPage({ affiliate, stats, commissions, baseUrl, success }: Props) {
  const referralLink = `${baseUrl}/?ref=${affiliate.slug}`

  return (
    <Layout title="Dashboard" nav="affiliate" success={success}>
      <h2>Welcome, {affiliate.name}</h2>

      <article>
        <p>Your referral link: <code>{referralLink}</code></p>
      </article>

      <div class="grid">
        <article>
          <header>Total Clicks</header>
          <p style="font-size:2rem;font-weight:bold">{stats.clickCount}</p>
        </article>
        <article>
          <header>Pending</header>
          <p style="font-size:2rem;font-weight:bold">${stats.totalPending.toFixed(2)}</p>
        </article>
        <article>
          <header>Paid</header>
          <p style="font-size:2rem;font-weight:bold">${stats.totalPaid.toFixed(2)}</p>
        </article>
      </div>

      <h3>Recent Commissions</h3>
      <figure>
        <table>
          <thead><tr><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            {commissions.length === 0 ? (
              <tr><td colSpan={3}>No commissions yet</td></tr>
            ) : commissions.map(cm => (
              <tr>
                <td>${cm.amount.toFixed(2)}</td>
                <td><Badge status={cm.status} /></td>
                <td>{new Date(cm.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figure>
    </Layout>
  )
}
```

- [ ] **Step 3: Create `src/views/pages/affiliate/payout.tsx`**

```tsx
import { Layout } from '../../layout'
import { FormField } from '../../components/form-field'

type Props = {
  currentEmail: string | null
  success?: string | null
  error?: string | null
}

export function AffiliatePayoutPage({ currentEmail, success, error }: Props) {
  return (
    <Layout title="Payout Settings" nav="affiliate" success={success} error={error}>
      <h2>Payout Settings</h2>
      <form method="post" action="/portal/payout">
        <FormField
          label="Payout Email (PayPal, Wise, etc.)"
          name="payoutEmail"
          type="email"
          value={currentEmail ?? ''}
          required
          placeholder="your-payout@email.com"
        />
        <button type="submit">Save</button>
      </form>
      {currentEmail && <p><small>Current: {currentEmail}</small></p>}
    </Layout>
  )
}
```

- [ ] **Step 4: Create `src/routes/affiliate-ui.ts`**

```typescript
import { Hono } from 'hono'
import { setCookie, deleteCookie } from 'hono/cookie'
import { eq, and, desc, sql } from 'drizzle-orm'
import { db } from '../db'
import { affiliates, magicLinks, commissions, clicks } from '../db/schema'
import { signJwt } from '../lib/jwt'
import { sendEmail } from '../lib/email'
import { affiliateCookieAuth } from '../middleware/affiliate-cookie-auth'
import { env } from '../config'
import { AffiliateLoginPage } from '../views/pages/affiliate/login'
import { AffiliateDashboardPage } from '../views/pages/affiliate/dashboard'
import { AffiliatePayoutPage } from '../views/pages/affiliate/payout'

export const affiliateUiRoute = new Hono()

// Login page
affiliateUiRoute.get('/login', (c) => {
  return c.html(<AffiliateLoginPage />)
})

// Send magic link
affiliateUiRoute.post('/login', async (c) => {
  const form = await c.req.parseBody()
  const email = form.email as string

  if (!email) return c.html(<AffiliateLoginPage error="Email required" />)

  const affiliate = await db.query.affiliates.findFirst({
    where: and(eq(affiliates.email, email), eq(affiliates.status, 'active')),
  })

  if (affiliate) {
    const token = crypto.randomUUID()
    await db.insert(magicLinks).values({
      id: crypto.randomUUID(),
      affiliateId: affiliate.id,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    })

    const magicUrl = `${env.BASE_URL}/portal/auth?token=${token}`
    try {
      await sendEmail(email, 'Your login link',
        `<p>Hi ${affiliate.name},</p><p><a href="${magicUrl}">Click here to access your dashboard</a></p><p>Expires in 1 hour.</p>`)
    } catch (err) {
      console.warn('[EMAIL ERROR]', err)
    }
  }

  // Always show success to prevent email enumeration
  return c.html(<AffiliateLoginPage sent={true} />)
})

// Auth — exchange magic link token for cookie
affiliateUiRoute.get('/auth', async (c) => {
  const token = c.req.query('token')
  if (!token) return c.redirect('/portal/login')

  const link = await db.query.magicLinks.findFirst({ where: eq(magicLinks.token, token) })
  if (!link || link.usedAt || new Date() > link.expiresAt) {
    return c.html(<AffiliateLoginPage error="Invalid or expired link. Request a new one." />)
  }

  await db.update(magicLinks).set({ usedAt: new Date() }).where(eq(magicLinks.id, link.id))

  const jwt = await signJwt({ sub: link.affiliateId, role: 'affiliate' }, '7d')
  setCookie(c, 'rk_affiliate', jwt, {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })
  return c.redirect('/portal')
})

// Logout
affiliateUiRoute.post('/logout', (c) => {
  deleteCookie(c, 'rk_affiliate', { path: '/' })
  return c.redirect('/portal/login')
})

// Dashboard
affiliateUiRoute.get('/', affiliateCookieAuth, async (c) => {
  const affiliateId = c.get('affiliateId') as string
  const success = c.req.query('success') || null

  const affiliate = await db.query.affiliates.findFirst({
    where: eq(affiliates.id, affiliateId),
    columns: { name: true, slug: true, email: true },
  })
  if (!affiliate) return c.redirect('/portal/login')

  const recentCommissions = await db
    .select()
    .from(commissions)
    .where(eq(commissions.affiliateId, affiliateId))
    .orderBy(desc(commissions.createdAt))
    .limit(20)

  const pendingRows = await db
    .select({ total: sql<number>`coalesce(sum(${commissions.amount}), 0)` })
    .from(commissions)
    .where(and(eq(commissions.affiliateId, affiliateId), eq(commissions.status, 'pending')))

  const paidRows = await db
    .select({ total: sql<number>`coalesce(sum(${commissions.amount}), 0)` })
    .from(commissions)
    .where(and(eq(commissions.affiliateId, affiliateId), eq(commissions.status, 'paid')))

  const clickRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(clicks)
    .where(eq(clicks.affiliateId, affiliateId))

  return c.html(
    <AffiliateDashboardPage
      affiliate={affiliate}
      stats={{
        totalPending: Number(pendingRows[0].total),
        totalPaid: Number(paidRows[0].total),
        clickCount: Number(clickRows[0].count),
      }}
      commissions={recentCommissions}
      baseUrl={env.BASE_URL}
      success={success}
    />
  )
})

// Payout page
affiliateUiRoute.get('/payout', affiliateCookieAuth, async (c) => {
  const affiliateId = c.get('affiliateId') as string
  const success = c.req.query('success') || null
  const error = c.req.query('error') || null

  const affiliate = await db.query.affiliates.findFirst({
    where: eq(affiliates.id, affiliateId),
    columns: { payoutEmail: true },
  })

  return c.html(<AffiliatePayoutPage currentEmail={affiliate?.payoutEmail ?? null} success={success} error={error} />)
})

affiliateUiRoute.post('/payout', affiliateCookieAuth, async (c) => {
  const affiliateId = c.get('affiliateId') as string
  const form = await c.req.parseBody()
  const payoutEmail = form.payoutEmail as string

  if (!payoutEmail) return c.redirect('/portal/payout?error=Email+required')

  await db.update(affiliates).set({ payoutEmail }).where(eq(affiliates.id, affiliateId))
  return c.redirect('/portal/payout?success=Payout+email+updated')
})
```

- [ ] **Step 5: Register route in `src/app.ts`**

Add import and registration:
```typescript
import { affiliateUiRoute } from './routes/affiliate-ui'
// in createApp:
app.route('/portal', affiliateUiRoute)
```

- [ ] **Step 6: Commit**

```bash
git add src/views/pages/affiliate/ src/routes/affiliate-ui.ts src/app.ts
git commit -m "feat(ui): affiliate portal — login, dashboard, payout"
```

---

### Task 9: Join page UI

**Files:**
- Create: `src/views/pages/join.tsx`
- Create: `src/routes/join-ui.ts`
- Modify: `src/app.ts`

- [ ] **Step 1: Create `src/views/pages/join.tsx`**

```tsx
import { Layout } from '../layout'
import { FormField } from '../components/form-field'

type Props = {
  programName: string
  programId: string
  success?: boolean
  error?: string | null
}

export function JoinPage({ programName, programId, success, error }: Props) {
  return (
    <Layout title={`Join ${programName}`} nav={null} error={error}>
      <article>
        <header><h2>Join {programName}'s Affiliate Program</h2></header>
        {success ? (
          <p>Your application has been submitted! You'll be notified once approved.</p>
        ) : (
          <form method="post" action={`/join/${programId}/form`}>
            <FormField label="Your Name" name="name" required />
            <FormField label="Email" name="email" type="email" required />
            <FormField label="Referral Slug" name="slug" required placeholder="e.g. yourname (lowercase, no spaces)" />
            <small>Your referral link will be: <code>?ref=your-slug</code></small>
            <br /><br />
            <button type="submit">Apply</button>
          </form>
        )}
      </article>
    </Layout>
  )
}
```

- [ ] **Step 2: Create `src/routes/join-ui.ts`**

```typescript
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
```

- [ ] **Step 3: Register route in `src/app.ts`**

Add import and registration:
```typescript
import { joinUiRoute } from './routes/join-ui'
// in createApp — place BEFORE the API join route to avoid conflicts:
app.route('/join', joinUiRoute)
```

Note: The existing `/join/:program_id` API (GET/POST JSON) and `/join/:program_id/form` (HTML) coexist without conflict because the UI uses the `/form` suffix.

- [ ] **Step 4: Commit**

```bash
git add src/views/pages/join.tsx src/routes/join-ui.ts src/app.ts
git commit -m "feat(ui): public join page for affiliate self-signup"
```

---

### Task 10: Integration test — full UI smoke test

**Files:**
- Create: `tests/ui.test.ts`

- [ ] **Step 1: Write smoke tests**

```typescript
// tests/ui.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { createApp } from '../src/app'
import { db } from '../src/db'
import { adminUser, program } from '../src/db/schema'
import { hash } from 'bcryptjs'
import { eq } from 'drizzle-orm'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@test.com'

beforeAll(async () => {
  await db.delete(adminUser)
  await db.insert(adminUser).values({
    id: 'admin-ui-test',
    email: ADMIN_EMAIL,
    passwordHash: await hash('testpass123', 12),
  })
})

afterAll(async () => {
  await db.delete(adminUser).where(eq(adminUser.id, 'admin-ui-test'))
})

describe('Admin UI', () => {
  it('GET /panel/login returns HTML login form', async () => {
    const { app } = createApp([])
    const res = await app.request('/panel/login')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Admin Login')
    expect(html).toContain('<form')
  })

  it('POST /panel/login with correct password sets cookie and redirects', async () => {
    const { app } = createApp([])
    const res = await app.request('/panel/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'password=testpass123',
      redirect: 'manual',
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/panel')
    const setCookieHeader = res.headers.get('set-cookie') ?? ''
    expect(setCookieHeader).toContain('rk_admin=')
  })

  it('POST /panel/login with wrong password shows error', async () => {
    const { app } = createApp([])
    const res = await app.request('/panel/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'password=wrong',
    })
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Invalid password')
  })

  it('GET /panel without cookie redirects to login', async () => {
    const { app } = createApp([])
    const res = await app.request('/panel', { redirect: 'manual' })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/panel/login')
  })

  it('GET /panel with valid cookie returns dashboard HTML', async () => {
    const { app } = createApp([])
    // Login first to get cookie
    const loginRes = await app.request('/panel/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'password=testpass123',
      redirect: 'manual',
    })
    const cookie = loginRes.headers.get('set-cookie')?.split(';')[0] ?? ''

    const res = await app.request('/panel', {
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Dashboard')
  })
})

describe('Affiliate UI', () => {
  it('GET /portal/login returns HTML', async () => {
    const { app } = createApp([])
    const res = await app.request('/portal/login')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Affiliate Portal')
  })

  it('GET /portal without cookie redirects to login', async () => {
    const { app } = createApp([])
    const res = await app.request('/portal', { redirect: 'manual' })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/portal/login')
  })
})

describe('Join UI', () => {
  beforeAll(async () => {
    await db.insert(program).values({
      id: 'prog-ui-test',
      name: 'UI Test Program',
      websiteUrl: 'https://uitest.com',
      apiKey: 'key-ui-test',
      cookieDays: 30,
    }).onConflictDoNothing()
  })

  afterAll(async () => {
    await db.delete(program).where(eq(program.id, 'prog-ui-test'))
  })

  it('GET /join/:id/form returns HTML form', async () => {
    const { app } = createApp([])
    const res = await app.request('/join/prog-ui-test/form')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('UI Test Program')
    expect(html).toContain('<form')
  })

  it('GET /join/unknown/form returns 404', async () => {
    const { app } = createApp([])
    const res = await app.request('/join/unknown/form')
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run tests**

```bash
cd /Users/daniellemes/projetos/pessoal/refkit/refkit && bun test tests/ui.test.ts
```

Expected: PASS — all tests pass.

- [ ] **Step 3: Run full test suite to verify no regressions**

```bash
cd /Users/daniellemes/projetos/pessoal/refkit/refkit && bun test
```

Expected: all tests pass (existing + new UI tests).

- [ ] **Step 4: Commit**

```bash
git add tests/ui.test.ts
git commit -m "test(ui): smoke tests for admin, affiliate, and join pages"
```

---

## Self-Review

**Spec coverage:**
- ✅ Layout with Pico CSS CDN
- ✅ Admin: login, dashboard, program, affiliates (list + invite + status), rules (list + create + delete), commissions (list + pay), events (list)
- ✅ Affiliate: login (magic link), dashboard (stats + commissions), payout
- ✅ Join: public signup form with validation
- ✅ Cookie auth (HttpOnly JWT cookies)
- ✅ Zero client JS — all form POST + redirect
- ✅ Shared components (DataTable, Badge, FormField, Alert)

**Type consistency:**
- Layout props: `title, nav, children, success?, error?` — used consistently
- Cookie names: `rk_admin`, `rk_affiliate` — consistent across middleware and route handlers
- All page components receive typed props matching DB query results

**Placeholder scan:** None found. All code is complete.
