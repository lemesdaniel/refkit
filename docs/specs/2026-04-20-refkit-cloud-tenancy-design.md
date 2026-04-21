# Refkit Cloud — Tenant Isolation Design Spec

**Produto:** refkit-cloud — módulo privado que importa o core e adiciona multi-tenancy  
**Escopo:** Tenant isolation (workspace + programa), auth de workspace, rotas admin filtradas  
**Fora de escopo:** Billing, planos, limites, multi-member, frontend custom

---

## Decisões

- **Repositório separado** — refkit-cloud é seu próprio repo, importa refkit via git dependency
- **Banco compartilhado** — workspace_id filtra dados, não banco separado por tenant
- **Single-owner** — um workspace = um owner (sem roles/membros)
- **Só API + plugin** — sem frontend dedicado neste ciclo (reutiliza pages do core com dados filtrados)
- **Isolamento via program** — o core já isola por API key/program. Cada workspace tem 1 programa. O cloud filtra rotas admin por programId.

---

## Arquitetura

O core **não muda**. O cloud importa `createApp` e adiciona:

```
refkit-cloud/
├── src/
│   ├── index.ts                # Entry point — monta app com tenancyPlugin
│   ├── config.ts               # Env vars (DATABASE_URL, JWT_SECRET, BASE_URL)
│   ├── db/
│   │   ├── schema.ts           # Tabela workspaces
│   │   ├── index.ts            # Instância DB (schema core + workspaces)
│   │   ├── migrate.ts          # Roda migrations
│   │   └── migrations/
│   ├── plugin.ts               # tenancyPlugin (RefkitPlugin)
│   ├── routes/
│   │   ├── workspace.ts        # Registro + login de workspace
│   │   └── cloud-admin.ts      # Rotas admin filtradas por programId
│   └── middleware/
│       └── workspace-auth.ts   # JWT workspace → injeta programId
├── package.json                # depends on "refkit" via git
├── tsconfig.json
├── drizzle.config.ts
├── Dockerfile
├── docker-compose.yml
└── tests/
    ├── workspace.test.ts
    └── cloud-admin.test.ts
```

---

## Schema

### Tabela `workspaces` (cloud-only)

```sql
workspaces
  id TEXT PK
  email TEXT UNIQUE NOT NULL
  password_hash TEXT NOT NULL
  program_id TEXT UNIQUE NOT NULL → program(id)
  created_at TIMESTAMPTZ DEFAULT NOW()
```

Relação 1:1 com `program`. Ao registrar um workspace, o cloud cria automaticamente o programa vinculado.

---

## Rotas

### Workspace auth (`/workspace/*`)

| Rota | Auth | Descrição |
|------|------|-----------|
| `POST /workspace/register` | — | Cria workspace + programa. Body: `{ email, password, programName, websiteUrl }`. Retorna JWT + set cookie. |
| `POST /workspace/auth` | — | Login. Body: `{ email, password }`. Retorna JWT + set cookie. |
| `GET /workspace/me` | JWT workspace | Info do workspace + programa (nome, apiKey, websiteUrl). |

### Cloud admin (`/admin/*`) — override das rotas do core

Todas protegidas por `workspaceAuth` middleware. Filtram por `programId` do workspace.

| Rota | Descrição |
|------|-----------|
| `GET /admin/program` | Retorna programa do workspace |
| `PUT /admin/program` | Atualiza programa do workspace |
| `GET /admin/affiliates` | Afiliados do programa |
| `POST /admin/affiliates/invite` | Convida afiliado (vinculado ao programa) |
| `PATCH /admin/affiliates/:id` | Atualiza status (valida que pertence ao programa) |
| `GET /admin/commission-rules` | Regras do programa |
| `POST /admin/commission-rules` | Cria regra (programId injetado automaticamente) |
| `DELETE /admin/commission-rules/:id` | Deleta regra (valida ownership) |
| `GET /admin/commissions` | Comissões do programa |
| `PATCH /admin/commissions/:id/pay` | Marca como paga (valida ownership) |
| `GET /admin/events` | Eventos do programa |

A diferença em relação ao core: cada query inclui `WHERE program_id = ?` usando o `programId` do contexto.

---

## Entry Point

```typescript
// src/index.ts
import { Hono } from 'hono'
import { createApp } from 'refkit'
import { tenancyPlugin } from './plugin'
import { workspaceRoute } from './routes/workspace'
import { cloudAdminRoute } from './routes/cloud-admin'
import { env } from './config'
import { runMigrations } from './db/migrate'

await runMigrations()

// Core app — handles /click, /e, /refkit.js, /health, /affiliate/*, /join/*
const { app } = createApp([tenancyPlugin])

// Cloud-specific routes
app.route('/workspace', workspaceRoute)

// Override admin routes with workspace-filtered versions
// The core admin routes still exist but are unreachable because
// cloud-admin is registered on the same path with priority
app.route('/admin', cloudAdminRoute)

export default {
  port: env.PORT,
  fetch: app.fetch,
}
```

---

## Plugin

```typescript
// src/plugin.ts
import type { RefkitPlugin } from 'refkit/plugins/types'

export const tenancyPlugin: RefkitPlugin = {
  // No onRequest needed for ingestion routes (/click, /e)
  // because they already authenticate via API key → program
  // The plugin is a placeholder for future hooks (onEvent, onAffiliateSigned)
}
```

O plugin é minimal porque o isolamento já acontece via API key nas rotas de ingestão. O real trabalho de isolamento está no `workspaceAuth` middleware aplicado às rotas admin.

---

## Middleware `workspaceAuth`

```typescript
// Lê cookie rk_workspace (ou header Authorization)
// Verifica JWT com role: 'workspace'
// Busca workspace por sub → extrai programId
// Injeta programId e workspaceId no contexto
// Rotas admin usam c.get('programId') para filtrar
```

---

## Auth Flow

### Registro

1. `POST /workspace/register` com `{ email, password, programName, websiteUrl }`
2. Valida: email único, password >= 8 chars
3. Cria programa (id=UUID, apiKey=UUID, name, websiteUrl, cookieDays=30)
4. Cria workspace (id=UUID, email, passwordHash=bcrypt, programId)
5. Gera JWT (sub=workspaceId, role='workspace', 30d)
6. Set cookie `rk_workspace` (HttpOnly, SameSite=Lax, 30d)
7. Retorna `{ token, workspace: { id, email }, program: { id, apiKey } }`

### Login

1. `POST /workspace/auth` com `{ email, password }`
2. Busca workspace por email
3. Verifica password via bcrypt
4. Gera JWT + set cookie
5. Retorna `{ token }`

---

## package.json

```json
{
  "name": "refkit-cloud",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "refkit": "github:user/refkit",
    "hono": "^4.6.0",
    "drizzle-orm": "^0.36.0",
    "postgres": "^3.4.4",
    "bcryptjs": "^2.4.3",
    "jose": "^5.9.3"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "drizzle-kit": "^0.27.0",
    "typescript": "^5.7.0"
  },
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "start": "bun src/index.ts",
    "test": "bun test",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "bun src/db/migrate.ts"
  }
}
```

**Nota para desenvolvimento local:** enquanto o refkit não estiver publicado/no GitHub, usar `"refkit": "file:../refkit"` para iterar. Trocar por git dep antes de deploy.

---

## Migrations

O cloud roda suas próprias migrations que criam a tabela `workspaces`. As tabelas do core (program, affiliates, etc.) são criadas pelas migrations do core — o cloud importa e roda ambas.

---

## Fora de escopo

- Billing / Stripe
- Planos e limites (eventos, afiliados)
- Multi-member / roles
- Frontend dedicado (usa pages do core)
- Custom domain por workspace
- Email transacional cloud-specific
