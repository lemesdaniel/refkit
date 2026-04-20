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
