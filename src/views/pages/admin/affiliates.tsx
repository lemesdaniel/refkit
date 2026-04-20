import { Layout } from '../../layout'
import { Badge } from '../../components/badge'
import { FormField } from '../../components/form-field'

type Affiliate = {
  id: string
  name: string
  email: string
  slug: string
  status: string
  createdAt: Date
}

type Props = {
  affiliates: Affiliate[]
  success?: string | null
  error?: string | null
}

export function AdminAffiliatesPage({ affiliates, success, error }: Props) {
  return (
    <Layout title="Affiliates" nav="admin" success={success} error={error}>
      <h2>Affiliates</h2>
      <figure>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {affiliates.length === 0 ? (
              <tr><td colSpan={5}>No affiliates yet</td></tr>
            ) : affiliates.map(a => (
              <tr>
                <td>{a.name}</td>
                <td>{a.email}</td>
                <td>{a.slug}</td>
                <td><Badge status={a.status} /></td>
                <td>
                  <form method="post" action={`/panel/affiliates/${a.id}/status`} style="display:inline">
                    {a.status === 'active' ? (
                      <>
                        <input type="hidden" name="status" value="inactive" />
                        <button type="submit" class="outline secondary" style="padding:0.2rem 0.6rem;font-size:0.85em">Deactivate</button>
                      </>
                    ) : (
                      <>
                        <input type="hidden" name="status" value="active" />
                        <button type="submit" class="outline" style="padding:0.2rem 0.6rem;font-size:0.85em">Activate</button>
                      </>
                    )}
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </figure>

      <details>
        <summary>Invite New Affiliate</summary>
        <form method="post" action="/panel/affiliates/invite">
          <FormField label="Name" name="name" required />
          <FormField label="Email" name="email" type="email" required />
          <FormField label="Slug" name="slug" required placeholder="unique-slug" />
          <button type="submit">Send Invite</button>
        </form>
      </details>
    </Layout>
  )
}
