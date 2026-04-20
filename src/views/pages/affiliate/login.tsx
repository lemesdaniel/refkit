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
