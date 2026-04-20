import { Layout } from '../../layout'
import { FormField } from '../../components/form-field'

type Props = {
  program?: {
    id: string
    name: string
    websiteUrl: string
    apiKey: string
    cookieDays: number
  } | null
  success?: string | null
  error?: string | null
}

export function AdminProgramPage({ program, success, error }: Props) {
  return (
    <Layout title="Program" nav="admin" success={success} error={error}>
      <h2>Program Settings</h2>
      <form method="post" action="/panel/program">
        <FormField label="Program Name" name="name" value={program?.name ?? ''} required />
        <FormField label="Website URL" name="websiteUrl" value={program?.websiteUrl ?? ''} required placeholder="https://yoursite.com" />
        <FormField label="Cookie Duration (days)" name="cookieDays" type="number" value={String(program?.cookieDays ?? 30)} required />
        <button type="submit">{program ? 'Update Program' : 'Create Program'}</button>
      </form>

      {program && (
        <>
          <h3>API Key</h3>
          <pre><code>{program.apiKey}</code></pre>

          <h3>Tracking Script</h3>
          <pre><code>{`<script src="https://yourcdn.com/refkit.js" data-api-key="${program.apiKey}"></script>`}</code></pre>
        </>
      )}
    </Layout>
  )
}
