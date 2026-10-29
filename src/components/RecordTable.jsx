import { Pencil, Trash2 } from 'lucide-react'
import Empty from './Empty'

export default function RecordTable({ columns, rows, onEdit, onDelete, empty }) {
  if (!rows.length) return <Empty {...empty} />
  return (
    <div className="panel table-wrap">
      <table className="data">
        <thead>
          <tr>
            {columns.map((c) => <th key={c.key} className={c.className}>{c.label}</th>)}
            <th className="col-actions"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              {columns.map((c) => (
                <td key={c.key} className={c.className}>{c.render ? c.render(r) : r[c.key] ?? '—'}</td>
              ))}
              <td className="col-actions">
                <button className="icon-btn" onClick={() => onEdit(r)} aria-label="Edit"><Pencil size={16} /></button>
                <button className="icon-btn icon-btn--danger" onClick={() => onDelete(r)} aria-label="Delete"><Trash2 size={16} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
