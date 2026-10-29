export default function FormActions({ busy, error, onCancel, label }) {
  return (
    <>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancel</button>
        <button className="btn btn--primary" disabled={busy}>{busy ? 'Saving…' : label}</button>
      </div>
    </>
  )
}
