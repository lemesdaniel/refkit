type Props = {
  type: 'success' | 'error'
  message: string
}

export function Alert({ type, message }: Props) {
  const bg = type === 'success' ? 'var(--pico-ins-color)' : 'var(--pico-del-color)'
  return <article style={`background:${bg};padding:0.5rem 1rem;margin-bottom:1rem`}>{message}</article>
}
