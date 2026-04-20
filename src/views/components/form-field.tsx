type Props = {
  label: string
  name: string
  type?: string
  value?: string
  required?: boolean
  error?: string
  placeholder?: string
  readonly?: boolean
}

export function FormField({ label, name, type = 'text', value, required, error, placeholder, readonly }: Props) {
  return (
    <label>
      {label}
      <input
        type={type}
        name={name}
        value={value}
        required={required}
        placeholder={placeholder}
        readOnly={readonly}
        {...(error ? { 'aria-invalid': 'true' } : {})}
      />
      {error && <small style="color:var(--pico-del-color)">{error}</small>}
    </label>
  )
}
