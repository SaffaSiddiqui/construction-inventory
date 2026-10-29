import { useState } from 'react'
import { ImagePlus } from 'lucide-react'
import FormActions from './FormActions'
import { createProduct, updateProduct } from '../../lib/inventory'
import { compressImage } from '../../lib/image'
import { QUALITIES, UNITS } from '../../lib/schema'

export default function ProductForm({ initial, onSaved, onCancel }) {
  const editing = Boolean(initial?.id)
  const [v, setV] = useState({
    name: initial?.name || '',
    quality: initial?.quality || '',
    unit: initial?.unit || 'bag',
    category: initial?.category || '',
    notes: initial?.notes || '',
    image_url: initial?.image_url || null,
  })
  const [opening, setOpening] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(initial?.image_url || null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value })

  async function pick(e) {
    const f = e.target.files?.[0]
    if (!f) return
    const small = await compressImage(f)
    setFile(small)
    setPreview(URL.createObjectURL(small))
  }

  function removeImage() {
    setFile(null)
    setPreview(null)
    setV({ ...v, image_url: null })
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!v.name.trim()) return setError('Enter the product name')
    setBusy(true)
    try {
      editing ? await updateProduct(initial.id, v, file) : await createProduct(v, opening, file)
      onSaved(editing ? 'Product updated' : 'Product added')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="field field--full">
        <span>Photo</span>
        <div className="photo-input">
          <span className="photo-preview">{preview ? <img src={preview} alt="Product preview" /> : <ImagePlus size={28} />}</span>
          <div>
            <label className="btn btn--ghost btn--sm file-btn">
              {preview ? 'Change photo' : 'Choose photo'}
              <input type="file" accept="image/*" onChange={pick} hidden />
            </label>
            {preview && <button type="button" className="btn btn--ghost btn--sm" onClick={removeImage}>Remove</button>}
            <small className="hint">The photo is made small and saved in Supabase Storage.</small>
          </div>
        </div>
      </div>
      <label className="field field--full">
        <span>Product name</span>
        <input value={v.name} onChange={set('name')} required />
      </label>
      <label className="field">
        <span>Unit</span>
        <select value={v.unit} onChange={set('unit')}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select>
      </label>
      <label className="field">
        <span>Quality</span>
        <select value={v.quality} onChange={set('quality')}>
          <option value="">Not set</option>
          {QUALITIES.map((q) => <option key={q}>{q}</option>)}
        </select>
      </label>
      <label className="field">
        <span>Category</span>
        <input value={v.category} onChange={set('category')} placeholder="Cement, steel, sand…" />
      </label>
      {!editing && (
        <label className="field">
          <span>Opening stock <em>({v.unit})</em></span>
          <input type="number" step="any" min="0" value={opening} onChange={(e) => setOpening(e.target.value)} placeholder="0" />
        </label>
      )}
      <label className="field field--full">
        <span>Notes</span>
        <textarea rows={2} value={v.notes} onChange={set('notes')} />
      </label>
      <div className="field--full"><FormActions busy={busy} error={error} onCancel={onCancel} label={editing ? 'Save changes' : 'Add product'} /></div>
    </form>
  )
}
