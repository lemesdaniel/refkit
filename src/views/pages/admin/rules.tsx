import { Layout } from '../../layout'
import { FormField } from '../../components/form-field'

type Rule = {
  id: string
  eventName: string
  commissionType: string
  commissionValue: number
}

type Props = {
  rules: Rule[]
  hasProgram: boolean
  success?: string | null
  error?: string | null
}

export function AdminRulesPage({ rules, hasProgram, success, error }: Props) {
  return (
    <Layout title="Commission Rules" nav="admin" success={success} error={error}>
      <h2>Commission Rules</h2>

      {!hasProgram ? (
        <article>Please configure your program first before adding rules.</article>
      ) : (
        <>
          <figure>
            <table>
              <thead>
                <tr>
                  <th>Event Name</th>
                  <th>Type</th>
                  <th>Value</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.length === 0 ? (
                  <tr><td colSpan={4}>No rules configured</td></tr>
                ) : rules.map(r => (
                  <tr>
                    <td>{r.eventName}</td>
                    <td>{r.commissionType}</td>
                    <td>{r.commissionType === 'percent' ? `${r.commissionValue}%` : `$${r.commissionValue.toFixed(2)}`}</td>
                    <td>
                      <form method="post" action={`/panel/rules/${r.id}/delete`} style="display:inline">
                        <button type="submit" class="outline secondary" style="padding:0.2rem 0.6rem;font-size:0.85em">Delete</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </figure>

          <details>
            <summary>Add New Rule</summary>
            <form method="post" action="/panel/rules">
              <FormField label="Event Name" name="eventName" required placeholder="purchase" />
              <label>
                Commission Type
                <select name="commissionType" required>
                  <option value="percent">Percent</option>
                  <option value="fixed">Fixed</option>
                </select>
              </label>
              <FormField label="Commission Value" name="commissionValue" type="number" required placeholder="10" />
              <button type="submit">Add Rule</button>
            </form>
          </details>
        </>
      )}
    </Layout>
  )
}
