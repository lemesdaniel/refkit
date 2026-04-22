# Refkit

Open source affiliate tracking for any digital product. Two lines of integration: a script tag on your page and a POST from your backend when an event happens.

## Quick Start

```bash
cp .env.example .env
# Edit .env with your database credentials, admin email, and JWT secret
docker compose up -d
```

The app runs migrations automatically on startup.

### 1. Create admin account and login

Open `http://localhost:3000/panel/login` in your browser. On first access, you'll need to set up the admin account:

```bash
curl -X POST http://localhost:3000/admin/setup \
  -H "Content-Type: application/json" \
  -d '{"password": "your-secure-password"}'
```

Then login at `http://localhost:3000/panel/login` with your password.

### 2. Create your program

Go to **Program** in the admin panel, fill in your product name and website URL, and save. Your API key will be generated automatically.

Or via API:

```bash
curl -X PUT http://localhost:3000/admin/program \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name": "My Product", "websiteUrl": "https://myproduct.com", "cookieDays": 30}'
```

### 3. Add the script to your website

```html
<script src="https://your-refkit-host/refkit.js" data-program="PROGRAM_ID"></script>
```

The script automatically:
- Creates a visitor cookie (`rk_visitor`)
- Detects `?ref=slug` in the URL and registers the click
- Exposes `window.Refkit.visitorToken` for your frontend to read

### 5. Report events from your backend

When a conversion happens (sale, trial, signup, etc.), POST from your backend:

```bash
curl -X POST https://your-refkit-host/e \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "event": "sale",
    "visitor_token": "rk_...",
    "revenue": 99.00,
    "metadata": {"plan": "pro"}
  }'
```

Refkit resolves the visitor to the referring affiliate and calculates the commission automatically.

### 6. Set up commission rules

Go to **Rules** in the admin panel and add a commission rule (e.g. 30% on "sale" events).

Or via API:

```bash
curl -X POST http://localhost:3000/admin/commission-rules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "programId": "PROGRAM_ID",
    "eventName": "sale",
    "commissionType": "percent",
    "commissionValue": 30
  }'
```

## How Attribution Works

```
1. Visitor lands on yoursite.com/?ref=daniel
2. Script detects ?ref=daniel, creates visitor cookie, POSTs /click
3. Visitor converts later (buys, signs up, etc.)
4. Your backend reads the rk_visitor cookie and POSTs /e with visitor_token
5. Refkit looks up the most recent click for that visitor within cookie_days
6. If found: creates commission based on matching commission_rule
```

## Web Panel

Refkit includes a built-in admin panel and affiliate portal — no separate frontend needed.

### Admin Panel (`/panel`)

- **Dashboard** — active affiliates, recent events, pending commissions
- **Program** — edit name, URL, cookie days, view API key
- **Affiliates** — invite, activate/deactivate, view all
- **Rules** — create and manage commission rules per event
- **Commissions** — view all, mark as paid
- **Events** — event log

### Affiliate Portal (`/portal`)

Affiliates login via magic link (no password):

1. Go to `http://localhost:3000/portal/login` and enter email
2. Receive a 1-hour login link via email
3. Dashboard shows: referral link, clicks, pending/paid commissions
4. Configure payout email in Payout settings

### Join Page (`/join/:program_id/form`)

Public self-registration form for affiliates. Share the link and new affiliates can apply — they start with `pending` status and need admin approval.

## Managing Affiliates

**Via admin panel:** Go to **Affiliates**, click "Invite New Affiliate", fill in name, email, and slug.

**Or via API:**
```bash
curl -X POST http://localhost:3000/admin/affiliates/invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name": "Daniel", "email": "daniel@example.com", "slug": "daniel"}'
```

**Self-registration:** Share `https://your-refkit-host/join/PROGRAM_ID/form` — affiliates apply and you approve them in the panel.

## API Reference

### Web UI

| Route | Auth | Description |
|-------|------|-------------|
| `GET /panel/login` | -- | Admin login page |
| `GET /panel` | Cookie | Admin dashboard |
| `GET /panel/program` | Cookie | Program configuration |
| `GET /panel/affiliates` | Cookie | Manage affiliates |
| `GET /panel/rules` | Cookie | Commission rules |
| `GET /panel/commissions` | Cookie | View/pay commissions |
| `GET /panel/events` | Cookie | Event log |
| `GET /portal/login` | -- | Affiliate login (magic link) |
| `GET /portal` | Cookie | Affiliate dashboard |
| `GET /portal/payout` | Cookie | Payout settings |
| `GET /join/:program_id/form` | -- | Affiliate self-signup form |

### JSON API

| Route | Auth | Description |
|-------|------|-------------|
| `GET /health` | -- | Health check |
| `GET /refkit.js` | -- | Client tracking script |
| `POST /click` | -- | Register click (from script) |
| `POST /e` | Bearer api_key | Register event (from your backend) |
| `POST /admin/setup` | -- | Create admin account (first time only) |
| `POST /admin/auth` | -- | Admin login |
| `GET /admin/program` | JWT admin | Get program config |
| `PUT /admin/program` | JWT admin | Create/update program |
| `GET /admin/affiliates` | JWT admin | List affiliates |
| `POST /admin/affiliates/invite` | JWT admin | Invite affiliate |
| `PATCH /admin/affiliates/:id` | JWT admin | Update affiliate status |
| `GET /admin/commission-rules` | JWT admin | List commission rules |
| `POST /admin/commission-rules` | JWT admin | Create commission rule |
| `DELETE /admin/commission-rules/:id` | JWT admin | Delete commission rule |
| `GET /admin/commissions` | JWT admin | List commissions |
| `PATCH /admin/commissions/:id/pay` | JWT admin | Mark commission as paid |
| `GET /admin/events` | JWT admin | List events |
| `GET /join/:program_id` | -- | Program info (for signup page) |
| `POST /join/:program_id` | -- | Affiliate self-registration |
| `POST /affiliate/magic-link` | -- | Request login link |
| `GET /affiliate/auth` | token param | Exchange magic link for JWT |
| `GET /affiliate/dashboard` | JWT affiliate | Affiliate stats and commissions |
| `PATCH /affiliate/payout` | JWT affiliate | Update payout email |

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ADMIN_EMAIL` | Yes | Admin account email |
| `JWT_SECRET` | Yes | Secret for signing JWTs (min 32 chars) |
| `BASE_URL` | No | Public URL (default: http://localhost:3000) |
| `PORT` | No | Server port (default: 3000) |
| `SMTP_HOST` | No | SMTP server for emails |
| `SMTP_PORT` | No | SMTP port (default: 587) |
| `SMTP_USER` | No | SMTP username |
| `SMTP_PASS` | No | SMTP password |
| `EMAIL_FROM` | No | From address (default: noreply@refk.it) |

Without SMTP configured, magic links and invites are logged to console (useful for development).

## Development

```bash
bun install
bun run dev          # Start with hot reload
bun test             # Run tests
bun run db:generate  # Generate migration after schema change
bun run db:migrate   # Apply migrations
bun run build:script # Build refkit.js client script
```

## Stack

- **Runtime:** Bun
- **Framework:** Hono
- **ORM:** Drizzle
- **Database:** PostgreSQL
- **Admin UI:** Hono JSX (server-rendered) + Pico CSS
- **Client script:** Vanilla JS (~1KB minified)
- **Self-host:** Docker Compose

## License

MIT
