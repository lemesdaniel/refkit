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
