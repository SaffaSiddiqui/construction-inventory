import { useMemo, useState } from 'react'
import { PackagePlus } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import FilterBar, { emptyFilters } from '../components/FilterBar'
import RecordTable from '../components/RecordTable'
import Modal from '../components/Modal'
import ReceiveForm from '../components/forms/ReceiveForm'
import { receiveColumns } from '../components/columns'
import { useData } from '../context/Data'
import { runDelete, useFeedback } from '../context/Feedback'
import { enrichReceives } from '../lib/enrich'
import { deleteReceive } from '../lib/inventory'
import { fmtDate, today } from '../lib/format'

export default function Receive() {
  const { data, loading, error, reload } = useData()
  const { toast, confirm } = useFeedback()
  const [filters, setFilters] = useState(emptyFilters)
  const [editing, setEditing] = useState(null)

  const all = useMemo(() => enrichReceives(data), [data])
  const rows = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
    return all.filter(
      (r) =>
        (!q || r.product_name?.toLowerCase().includes(q) || r.supplier?.toLowerCase().includes(q)) &&
        (!filters.from || r.received_date >= filters.from) &&
        (!filters.to || r.received_date <= filters.to)
    )
  }, [all, filters])

  const thisMonth = all.filter((r) => r.received_date?.startsWith(today().slice(0, 7))).length
  const last = all[0]

  const remove = (r) =>
    runDelete({
      confirm, toast,
      title: 'Delete this receipt?',
      message: `${r.product_name} received on ${fmtDate(r.received_date)} will be removed and the stock will go down.`,
      confirmLabel: 'Delete receipt',
      action: () => deleteReceive(r.id),
      done: reload,
    })

  return (
    <div className="page page--receive">
      <PageHeader
        title="Receive"
        subtitle="Material that has come into the store."
        action={<button className="btn btn--primary" onClick={() => setEditing({})}><PackagePlus size={18} /> Receive material</button>}
      />
      <div className="stats">
        <StatCard label="Receipts recorded" value={all.length} />
        <StatCard label="Received this month" value={thisMonth} note="receipts" />
        <StatCard label="Last received" value={last ? fmtDate(last.received_date) : '—'} note={last?.product_name} />
      </div>

      <FilterBar values={filters} onChange={setFilters} show={{ dates: true }} searchPlaceholder="Search material or supplier" />

      {error && <p className="form-error">Could not load records: {error}</p>}
      {loading ? (
        <p className="loading">Loading receipts…</p>
      ) : (
        <RecordTable
          columns={receiveColumns}
          rows={rows}
          onEdit={setEditing}
          onDelete={remove}
          empty={{
            icon: PackagePlus,
            title: all.length ? 'No receipts match these filters' : 'No material received yet',
            text: all.length ? 'Try a different name or date range.' : 'Record the first delivery to start the register.',
          }}
        />
      )}

      {editing && (
        <Modal title={editing.id ? 'Edit receipt' : 'Receive material'} onClose={() => setEditing(null)}>
          <ReceiveForm
            initial={editing.id ? editing : null}
            products={data.products}
            onSaved={(m) => { setEditing(null); toast(m); reload() }}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </div>
  )
}
