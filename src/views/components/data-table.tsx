import type { Child } from 'hono/jsx'

type Column<T> = {
  key: keyof T & string
  label: string
  render?: (value: T[keyof T], row: T) => Child
}

type Props<T> = {
  columns: Column<T>[]
  rows: T[]
  actions?: (row: T) => Child
}

export function DataTable<T extends Record<string, unknown>>({ columns, rows, actions }: Props<T>) {
  return (
    <figure>
      <table>
        <thead>
          <tr>
            {columns.map(col => <th>{col.label}</th>)}
            {actions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length + (actions ? 1 : 0)}>No data</td></tr>
          ) : (
            rows.map(row => (
              <tr>
                {columns.map(col => (
                  <td>{col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '—')}</td>
                ))}
                {actions && <td>{actions(row)}</td>}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </figure>
  )
}
