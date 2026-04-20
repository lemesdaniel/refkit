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
