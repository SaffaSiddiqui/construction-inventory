import { useState } from 'react'
import FormActions from './FormActions'
import { createIssue, updateIssue } from '../../lib/inventory'
import { fmt, today } from '../../lib/format'

export default function IssueForm({ initial, products, projects, departments, onSaved, onCancel }) {
  const editing = Boolean(initial?.id)
  const [v, setV] = useState({
    product_id: initial?.product_id || '',
    quantity: initial?.quantity ?? '',
    project_id: initial?.project_id || '',
    department_id: initial?.department_id || '',
    issued_to: initial?.issued_to || '',
    issue_date: initial?.issue_date || today(),
    note: initial?.note || '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value })

  const product = products.find((p) => p.id === v.product_id)
  const manager = projects.find((p) => p.id === v.project_id)?.manager_name
  const deptOptions = departments.filter((d) => !d.project_id || d.project_id === v.project_id)
  // When editing, the quantity already issued is available again
  const available = product ? Number(product.quantity) + (editing && initial.product_id === product.id ? Number(initial.quantity) : 0) : null

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!v.product_id) return setError('Choose the material to issue')
    if (!v.project_id) return setError('Choose the project')
    if (!v.department_id) return setError('Choose the department')
    if (!(Number(v.quantity) > 0)) return setError('Quantity must be more than 0')
    setBusy(true)
    try {
      editing ? await updateIssue(initial.id, v) : await createIssue(v)
      onSaved(editing ? 'Issue updated' : 'Material issued')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!products.length) return <p className="confirm-text">There is no material in the store yet. Add a product and receive it first.</p>
  if (!projects.length) return <p className="confirm-text">Add a project first (Projects page), then you can issue material to it.</p>

  return (
    <form className="form" onSubmit={submit}>
      <label className="field field--full">
        <span>Material</span>
        <select value={v.product_id} onChange={set('product_id')} required>
          <option value="">Choose material</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({fmt(p.quantity)} {p.unit} in stock)</option>)}
        </select>
      </label>
      <label className="field">
        <span>Quantity {product && <em>({product.unit})</em>}</span>
        <input type="number" step="any" min="0" value={v.quantity} onChange={set('quantity')} required />
        {available !== null && <small className="hint">{fmt(available)} {product.unit} available</small>}
      </label>
      <label className="field">
        <span>Date issued</span>
        <input type="date" value={v.issue_date} onChange={set('issue_date')} required />
      </label>
      <label className="field">
        <span>Project</span>
        <select value={v.project_id} onChange={(e) => setV({ ...v, project_id: e.target.value, department_id: '' })} required>
          <option value="">Choose project</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {manager && <small className="hint">Manager: {manager}</small>}
      </label>
      <label className="field">
        <span>Department</span>
        <select value={v.department_id} onChange={set('department_id')} required disabled={!v.project_id}>
          <option value="">{v.project_id ? 'Choose department' : 'Choose a project first'}</option>
          {deptOptions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </label>
      <label className="field field--full">
        <span>Issued to (person)</span>
        <input value={v.issued_to} onChange={set('issued_to')} />
      </label>
      <label className="field field--full">
        <span>Note</span>
        <textarea rows={2} value={v.note} onChange={set('note')} />
      </label>
      <div className="field--full"><FormActions busy={busy} error={error} onCancel={onCancel} label={editing ? 'Save changes' : 'Issue material'} /></div>
    </form>
  )
}
