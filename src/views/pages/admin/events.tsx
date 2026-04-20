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
  success?: string | null
  error?: string | null
}

export function AdminEventsPage({ events, success, error }: Props) {
  return (
    <Layout title="Events" nav="admin" success={success} error={error}>
      <h2>Events</h2>
      <figure>
        <table>
          <thead>
            <tr>
              <th>Event Name</th>
              <th>Affiliate</th>
              <th>Revenue</th>
              <th>Metadata</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr><td colSpan={5}>No events yet</td></tr>
            ) : events.map(e => (
              <tr>
                <td>{e.eventName}</td>
                <td>{e.affiliateId ? `${e.affiliateId.slice(0, 8)}...` : '—'}</td>
                <td>{e.revenue != null ? `$${e.revenue.toFixed(2)}` : '—'}</td>
                <td>{e.metadata ? JSON.stringify(e.metadata).slice(0, 50) : '—'}</td>
                <td>{new Date(e.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figure>
    </Layout>
  )
}
