import { useState } from 'react'
import FormActions from './FormActions'
import { createReceive, updateReceive } from '../../lib/inventory'
import { today } from '../../lib/format'

export default function ReceiveForm({ initial, products, onSaved, onCancel }) {
  const editing = Boolean(initial?.id)
  const [v, setV] = useState({
    product_id: initial?.product_id || '',
    quantity: initial?.quantity ?? '',
    received_date: initial?.received_date || today(),
    supplier: initial?.supplier || '',
    note: initial?.note || '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value })
  const unit = products.find((p) => p.id === v.product_id)?.unit

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!v.product_id) return setError('Choose the material that was received')
    if (!(Number(v.quantity) > 0)) return setError('Quantity must be more than 0')
    setBusy(true)
    try {
      editing ? await updateReceive(initial.id, v) : await createReceive(v)
      onSaved(editing ? 'Receipt updated' : 'Receipt saved')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!products.length) return <p className="confirm-text">Add a product in Total Products first, then you can receive it here.</p>

  return (
    <form className="form" onSubmit={submit}>
      <label className="field field--full">
        <span>Material</span>
        <select value={v.product_id} onChange={set('product_id')} required>
          <option value="">Choose material</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <label className="field">
        <span>Quantity {unit && <em>({unit})</em>}</span>
        <input type="number" step="any" min="0" value={v.quantity} onChange={set('quantity')} required />
      </label>
      <label className="field">
        <span>Date received</span>
        <input type="date" value={v.received_date} onChange={set('received_date')} required />
      </label>
      <label className="field field--full">
        <span>Supplier</span>
        <input value={v.supplier} onChange={set('supplier')} />
      </label>
      <label className="field field--full">
        <span>Note</span>
        <textarea rows={2} value={v.note} onChange={set('note')} />
      </label>
      <div className="field--full"><FormActions busy={busy} error={error} onCancel={onCancel} label={editing ? 'Save changes' : 'Save receipt'} /></div>
    </form>
  )
}
