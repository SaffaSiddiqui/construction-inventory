import { useState } from 'react'
import FormActions from './FormActions'
import { createDepartment, updateDepartment } from '../../lib/inventory'

export default function DepartmentForm({ initial, projects, onSaved, onCancel }) {
  const editing = Boolean(initial?.id)
  const [v, setV] = useState({ name: initial?.name || '', project_id: initial?.project_id || '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!v.name.trim()) return setError('Enter the department name')
    setBusy(true)
    try {
      editing ? await updateDepartment(initial.id, v) : await createDepartment(v)
      onSaved(editing ? 'Department updated' : 'Department added')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <label className="field field--full"><span>Department name</span><input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} required /></label>
      <label className="field field--full">
        <span>Project</span>
        <select value={v.project_id} onChange={(e) => setV({ ...v, project_id: e.target.value })}>
          <option value="">All projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <div className="field--full"><FormActions busy={busy} error={error} onCancel={onCancel} label={editing ? 'Save changes' : 'Add department'} /></div>
    </form>
  )
}
