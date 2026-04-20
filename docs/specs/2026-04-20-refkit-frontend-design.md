# Refkit Frontend — Design Spec

**Produto:** Painel admin, portal do afiliado e join page para o Refkit open source  
**Stack:** Hono JSX (server-rendered) + Pico CSS (CDN) + zero client JS  
**Estilo:** Minimal/funcional (estilo Stripe/Linear)

---

## Arquitetura

```
src/
├── views/
│   ├── layout.tsx              # Shell HTML (Pico CSS CDN, nav, body)
│   ├── components/
│   │   ├── data-table.tsx      # Tabela semântica reutilizável
│   │   ├── badge.tsx           # Status badges (pending, active, paid, inactive)
│   │   ├── form-field.tsx      # Label + input + error
│   │   └── alert.tsx           # Mensagem sucesso/erro
│   └── pages/
│       ├── admin/
│       │   ├── login.tsx
│       │   ├── dashboard.tsx
│       │   ├── program.tsx
│       │   ├── affiliates.tsx
│       │   ├── rules.tsx
│       │   ├── commissions.tsx
│       │   └── events.tsx
│       ├── affiliate/
│       │   ├── login.tsx
│       │   ├── dashboard.tsx
│       │   └── payout.tsx
│       └── join.tsx
├── routes/
│   ├── admin-ui.ts             # GET/POST /panel/* (cookie auth)
│   ├── affiliate-ui.ts         # GET/POST /portal/* (cookie auth)
│   └── join-ui.ts              # GET/POST /join/:id/form (público)
```

### Princípios

- **API intocada** — as rotas UI são um consumidor separado, a API JSON continua funcionando para integrações externas
- **Zero client JavaScript** — toda interatividade via form POST + redirect. Funciona sem JS no browser.
- **Auth via cookie** — JWT em cookie HttpOnly em vez de header Authorization. Middleware das rotas UI lê o cookie.
- **Pico CSS via CDN** — sem build step de CSS, sem classes custom (classless por padrão)

---

## Auth via Cookie

### Admin

1. `GET /panel/login` → renderiza form de senha
2. `POST /panel/login` → verifica senha → set cookie `rk_admin` (JWT, HttpOnly, SameSite=Lax, 30d) → redirect `/panel`
3. Middleware `adminCookieAuth` em todas as rotas `/panel/*` (exceto login) — lê cookie, verifica JWT
4. `POST /panel/logout` → limpa cookie → redirect `/panel/login`

### Afiliado

1. `GET /portal/login` → renderiza form de email
2. `POST /portal/login` → envia magic link por email → renderiza "verifique seu email"
3. `GET /portal/auth?token=...` → valida magic link → set cookie `rk_affiliate` (JWT, HttpOnly, 7d) → redirect `/portal`
4. Middleware `affiliateCookieAuth` em todas as rotas `/portal/*` (exceto login/auth)
5. `POST /portal/logout` → limpa cookie → redirect `/portal/login`

---

## Páginas

### Admin (`/panel/*`)

#### Dashboard (`GET /panel`)
- Cards com: total de afiliados ativos, eventos nas últimas 24h, comissões pendentes (valor total)
- Tabela: últimos 5 eventos

#### Programa (`GET /panel/program`)
- Form editável: nome, website URL, cookie days
- Campo read-only: API key (com botão copy via inline onclick)
- `POST /panel/program` → salva → redirect com `?success=1`

#### Afiliados (`GET /panel/affiliates`)
- Tabela: nome, email, slug, status (badge), data de cadastro
- Ações inline por row:
  - Se pending/inactive → form POST para ativar
  - Se active → form POST para desativar
- Seção "Convidar": form com nome, email, slug → `POST /panel/affiliates/invite`

#### Regras de Comissão (`GET /panel/rules`)
- Tabela: evento, tipo (percent/fixed), valor, ações
- Ação: botão deletar (form POST)
- Seção "Nova regra": form com eventName, commissionType (select), commissionValue → `POST /panel/rules`

#### Comissões (`GET /panel/commissions`)
- Tabela: afiliado (nome), evento, valor, status (badge), data
- A��ão: se status=pending → botão "Marcar como paga" (form POST)

#### Eventos (`GET /panel/events`)
- Tabela: evento, afiliado (ou "—"), revenue, metadata (truncado), data
- Últimos 100, sem ações

### Afiliado (`/portal/*`)

#### Login (`GET /portal/login`)
- Form: email → `POST /portal/login` → envia magic link
- Após submit: mensagem "Link enviado para seu email"

#### Dashboard (`GET /portal`)
- Cards: total clicks, comissões pendentes (R$), comissões pagas (R$)
- Info: seu slug, seu link de referral (`BASE_URL/?ref=slug`)
- Tabela: últimas 20 comissões (evento, valor, status, data)

#### Payout (`GET /portal/payout`)
- Form: payout email → `POST /portal/payout` → salva → redirect com `?success=1`
- Mostra email atual

### Join Page (`GET /join/:program_id/form`)

- Mostra nome do programa
- Form: nome, email, slug → `POST /join/:program_id/form`
- Sucesso: "Cadastro enviado! Aguarde aprovação do administrador."
- Erro: mensagem inline (email já existe, slug tomado, etc.)

---

## Layout (`layout.tsx`)

```tsx
<html lang="en" data-theme="light">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css" />
    <title>{title} — Refkit</title>
  </head>
  <body>
    <nav class="container">
      <!-- Admin: Dashboard | Affiliates | Rules | Commissions | Events | Program | Logout -->
      <!-- Affiliate: Dashboard | Payout | Logout -->
      <!-- Join: sem nav -->
    </nav>
    <main class="container">
      {/* Alert de sucesso/erro se ?success ou ?error na URL */}
      {children}
    </main>
  </body>
</html>
```

---

## Componentes

### DataTable
- Props: `columns: { key, label }[]`, `rows: Record[]`, `actions?: (row) => JSX`
- Renderiza `<table>` semântica (Pico estiliza automaticamente)

### Badge
- Props: `status: string`
- Mapa: pending→amarelo, active→verde, paid→verde, inactive→cinza
- Usa `<mark>` ou `<ins>`/`<del>` que Pico já estiliza

### FormField
- Props: `label, name, type, value?, error?, required?`
- Renderiza `<label>` + `<input>` com `<small>` de erro

### Alert
- Props: `type: 'success' | 'error'`, `message: string`
- Usa `<article>` com role adequado

---

## Rotas POST do UI

As rotas POST processam a ação e redirecionam:

```typescript
// Exemplo: POST /panel/affiliates/:id/status
adminUiRoute.post('/affiliates/:id/status', adminCookieAuth, async (c) => {
  const id = c.req.param('id')
  const form = await c.req.parseBody()
  const status = form.status as string

  await db.update(affiliates).set({ status }).where(eq(affiliates.id, id))

  return c.redirect('/panel/affiliates?success=Status+atualizado')
})
```

Padrão: action → redirect com query param de feedback.

---

## tsconfig.json

Adicionar:
```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx"
  }
}
```

---

## Fora de escopo

- Dark mode toggle (Pico suporta via `data-theme`, mas não implementamos toggle)
- Paginação (limites fixos por agora: 100 eventos, 20 comissões afiliado)
- Busca/filtros
- Gráficos/charts
- Responsividade avançada (Pico já é responsivo por padrão)
- i18n (tudo em inglês)
