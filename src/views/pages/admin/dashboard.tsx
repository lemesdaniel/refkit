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
