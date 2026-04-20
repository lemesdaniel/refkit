import { Layout } from '../../layout'
import { Badge } from '../../components/badge'

type Commission = {
  id: string
  affiliateId: string
  amount: number
  status: string
  createdAt: Date
}

type Props = {
  commissions: Commission[]
  success?: string | null
  error?: string | null
}

export function AdminCommissionsPage({ commissions, success, error }: Props) {
  return (
    <Layout title="Commissions" nav="admin" success={success} error={error}>
      <h2>Commissions</h2>
      <figure>
        <table>
          <thead>
            <tr>
              <th>Affiliate</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {commissions.length === 0 ? (
              <tr><td colSpan={5}>No commissions yet</td></tr>
            ) : commissions.map(c => (
              <tr>
                <td>{c.affiliateId.slice(0, 8)}...</td>
                <td>${c.amount.toFixed(2)}</td>
                <td><Badge status={c.status} /></td>
                <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                <td>
                  {c.status === 'pending' ? (
                    <form method="post" action={`/panel/commissions/${c.id}/pay`} style="display:inline">
                      <button type="submit" class="outline" style="padding:0.2rem 0.6rem;font-size:0.85em">Mark Paid</button>
                    </form>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </figure>
    </Layout>
  )
}
