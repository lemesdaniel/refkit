const styles: Record<string, string> = {
  pending: 'background:#fff3cd;color:#856404;padding:0.1rem 0.5rem;border-radius:4px;font-size:0.85em',
  active: 'background:#d4edda;color:#155724;padding:0.1rem 0.5rem;border-radius:4px;font-size:0.85em',
  paid: 'background:#d4edda;color:#155724;padding:0.1rem 0.5rem;border-radius:4px;font-size:0.85em',
  inactive: 'background:#e2e3e5;color:#383d41;padding:0.1rem 0.5rem;border-radius:4px;font-size:0.85em',
  approved: 'background:#d4edda;color:#155724;padding:0.1rem 0.5rem;border-radius:4px;font-size:0.85em',
}

export function Badge({ status }: { status: string }) {
  const style = styles[status] ?? styles.inactive
  return <span style={style}>{status}</span>
}
