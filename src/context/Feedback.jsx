import { createContext, useCallback, useContext, useState } from 'react'
import Modal from '../components/Modal'

const Ctx = createContext(null)
export const useFeedback = () => useContext(Ctx)

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [dialog, setDialog] = useState(null)

  const toast = useCallback((message, type = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500)
  }, [])

  const confirm = useCallback((opts) => new Promise((resolve) => setDialog({ ...opts, resolve })), [])

  const answer = (value) => {
    dialog.resolve(value)
    setDialog(null)
  }

  return (
    <Ctx.Provider value={{ toast, confirm }}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`}>{t.message}</div>
        ))}
      </div>
      {dialog && (
        <Modal title={dialog.title} onClose={() => answer(false)} small>
          <p className="confirm-text">{dialog.message}</p>
          <div className="form-actions">
            <button className="btn btn--ghost" onClick={() => answer(false)}>Cancel</button>
            <button className="btn btn--danger" onClick={() => answer(true)}>{dialog.confirmLabel || 'Delete'}</button>
          </div>
        </Modal>
      )}
    </Ctx.Provider>
  )
}

// Ask first, delete in both backends, then tell the person what happened.
export async function runDelete({ confirm, toast, title, message, confirmLabel, action, done }) {
  if (!(await confirm({ title, message, confirmLabel }))) return
  try {
    await action()
    toast('Deleted')
    await done?.()
  } catch (e) {
    toast(e.message, 'error')
  }
}
