import { Layout } from '../layout'
import { FormField } from '../components/form-field'

type Props = {
  programName: string
  programId: string
  success?: boolean
  error?: string | null
}

export function JoinPage({ programName, programId, success, error }: Props) {
  return (
    <Layout title={`Join ${programName}`} nav={null} error={error}>
      <article>
        <header><h2>Join {programName}'s Affiliate Program</h2></header>
        {success ? (
          <p>Your application has been submitted! You'll be notified once approved.</p>
        ) : (
          <form method="post" action={`/join/${programId}/form`}>
            <FormField label="Your Name" name="name" required />
            <FormField label="Email" name="email" type="email" required />
            <FormField label="Referral Slug" name="slug" required placeholder="e.g. yourname (lowercase, no spaces)" />
            <small>Your referral link will be: <code>?ref=your-slug</code></small>
            <br /><br />
            <button type="submit">Apply</button>
          </form>
        )}
      </article>
    </Layout>
  )
}
