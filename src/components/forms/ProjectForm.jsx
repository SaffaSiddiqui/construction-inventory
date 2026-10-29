import { useState } from 'react'
import FormActions from './FormActions'
import { createProject, updateProject } from '../../lib/inventory'

export default function ProjectForm({ initial, onSaved, onCancel }) {
  const editing = Boolean(initial?.id)
  const [v, setV] = useState({ name: initial?.name || '', manager_name: initial?.manager_name || '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!v.name.trim() || !v.manager_name.trim()) return setError('Enter the project name and the manager name')
    setBusy(true)
    try {
      editing ? await updateProject(initial.id, v) : await createProject(v)
      onSaved(editing ? 'Project updated' : 'Project added')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <label className="field field--full"><span>Project name</span><input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} required /></label>
      <label className="field field--full"><span>Project manager</span><input value={v.manager_name} onChange={(e) => setV({ ...v, manager_name: e.target.value })} required /></label>
      <div className="field--full"><FormActions busy={busy} error={error} onCancel={onCancel} label={editing ? 'Save changes' : 'Add project'} /></div>
    </form>
  )
}
