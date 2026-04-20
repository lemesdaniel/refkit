# Refkit

Open source affiliate tracking for any digital product. Two lines of integration: a script tag on your page and a POST from your backend when an event happens.

## Quick Start

```bash
cp .env.example .env
# Edit .env with your database credentials, admin email, and JWT secret
docker compose up -d
```

The app runs migrations automatically on startup.

### 1. Create admin account

```bash
curl -X POST http://localhost:3000/admin/setup \
  -H "Content-Type: application/json" \
  -d '{"password": "your-secure-password"}'
```

### 2. Login

```bash
curl -X POST http://localhost:3000/admin/auth \
  -H "Content-Type: application/json" \
  -d '{"password": "your-secure-password"}'
# Returns: { "token": "eyJ..." }
```

### 3. Create your program

```bash
curl -X PUT http://localhost:3000/admin/program \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name": "My Product", "websiteUrl": "https://myproduct.com", "cookieDays": 30}'
# Returns: { "program": { "id": "...", "apiKey": "..." } }
```

Save the `apiKey` -- your backend uses it to report events.

### 4. Add the script to your website

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

## Managing Affiliates

**Invite an affiliate:**
```bash
curl -X POST http://localhost:3000/admin/affiliates/invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name": "Daniel", "email": "daniel@example.com", "slug": "daniel"}'
```

**Or let affiliates self-register:**
Share your join page: `https://your-refkit-host/join/PROGRAM_ID`

Self-registered affiliates start with `pending` status. Approve them:
```bash
curl -X PATCH http://localhost:3000/admin/affiliates/AFFILIATE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"status": "active"}'
```

## Affiliate Portal

Affiliates access their dashboard via magic link (no password):

1. Affiliate requests a login link: `POST /affiliate/magic-link` with `{"email": "..."}`
2. They receive an email with a 1-hour link
3. Link exchanges for a 7-day JWT
4. Dashboard shows: clicks, commissions (pending/paid), payout info

## API Reference

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
- **Client script:** Vanilla JS (~1KB minified)
- **Self-host:** Docker Compose

## License

MIT
