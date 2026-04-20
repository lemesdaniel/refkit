import { Layout } from '../../layout'
import { FormField } from '../../components/form-field'

type Props = { currentEmail: string | null; success?: string | null; error?: string | null }

export function AffiliatePayoutPage({ currentEmail, success, error }: Props) {
  return (
    <Layout title="Payout Settings" nav="affiliate" success={success} error={error}>
      <h2>Payout Settings</h2>
      <form method="post" action="/portal/payout">
        <FormField label="Payout Email (PayPal, Wise, etc.)" name="payoutEmail" type="email" value={currentEmail ?? ''} required placeholder="your-payout@email.com" />
        <button type="submit">Save</button>
      </form>
      {currentEmail && <p><small>Current: {currentEmail}</small></p>}
    </Layout>
  )
}
