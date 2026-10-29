import { useCallback, useEffect, useMemo, useState } from 'react'
import { Database, Plus, ServerCrash } from 'lucide-react'
import PageHeader from '../../src/components/PageHeader'
import FilterBar, { emptyFilters } from '../../src/components/FilterBar'
import RecordTable from '../../src/components/RecordTable'
import Modal from '../../src/components/Modal'
import FormFor, { SINGULAR, formTitle } from '../../src/components/forms/FormFor'
import { departmentColumns, issueColumns, projectColumns, receiveColumns } from '../../src/components/columns'
import { runDelete, useFeedback } from '../../src/context/Feedback'
import { dbApi } from '../../src/lib/dbApi'
import { DELETERS } from '../../src/lib/inventory'
import { productFlow } from '../../src/lib/enrich'
import { TABLE_ORDER } from '../../src/lib/schema'
import TableTabs from './TableTabs'
import ProductCardGrid from './ProductCardGrid'

const COLUMNS = { receives: receiveColumns, issues: issueColumns, projects: projectColumns, departments: departmentColumns }
const SHOW = {
  products: { quality: true, low: true },
  receives: { dates: true },
  issues: { project: true, department: true, dates: true },
  projects: {},
  departments: { project: true },
}
const EMPTY_ALL = { projects: [], departments: [], products: [], receives: [], issues: [] }

// One page for ALL tables. Every record on this page is read from Supabase.
export default function DatabasePage() {
  const { toast, confirm } = useFeedback()
  const [tab, setTab] = useState('products')
  const [filters, setFilters] = useState(emptyFilters)
  const [all, setAll] = useState(EMPTY_ALL)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)

  const loadAll = useCallback(async () => {
    const entries = await Promise.all(TABLE_ORDER.map(async (t) => [t, await dbApi.list(t)]))
    setAll(Object.fromEntries(entries))
  }, [])

  const loadRows = useCallback(async () => {
    setRows(await dbApi.list(tab, filters))
  }, [tab, filters])

  const refresh = useCallback(async () => {
    try {
      await Promise.all([loadAll(), loadRows()])
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [loadAll, loadRows])

  // Reload when the tab or filters change (small delay while typing in search)
  useEffect(() => {
    const t = setTimeout(refresh, filters.search ? 250 : 0)
    return () => clearTimeout(t)
  }, [refresh, filters.search])

  const changeTab = (key) => {
    setTab(key)
    setFilters(emptyFilters)
  }

  const counts = useMemo(() => Object.fromEntries(TABLE_ORDER.map((t) => [t, all[t].length])), [all])
  const flow = useMemo(() => productFlow(all), [all])
  const filtered = JSON.stringify(filters) !== JSON.stringify(emptyFilters)

  const remove = (r) =>
    runDelete({
      confirm, toast,
      title: `Delete this ${SINGULAR[tab]}?`,
      message: 'It will be removed from Supabase for good.',
      confirmLabel: `Delete ${SINGULAR[tab]}`,
      action: () => DELETERS[tab](r.id),
      done: refresh,
    })

  return (
    <div className="page page--database">
      <PageHeader
        title="Database"
        subtitle="Every record in one place, read from Supabase. Add, edit, delete, search and filter all tables."
        action={<button className="btn btn--primary" onClick={() => setEditing({})}><Plus size={18} /> Add {SINGULAR[tab]}</button>}
      />

      {error ? (
        <div className="panel server-down">
          <ServerCrash size={34} />
          <h3>Could not load the records</h3>
          <p>{error}</p>
          <button className="btn btn--primary btn--sm" onClick={refresh}>Try again</button>
        </div>
      ) : (
        <>
          <TableTabs tab={tab} onChange={changeTab} counts={counts} />
          <FilterBar
            values={filters}
            onChange={setFilters}
            show={SHOW[tab]}
            projects={all.projects}
            departments={all.departments}
            searchPlaceholder={tab === 'receives' || tab === 'issues' ? 'Search material name' : 'Search by name'}
          />
          {loading ? (
            <p className="loading">Loading records…</p>
          ) : tab === 'products' ? (
            <ProductCardGrid products={rows} flow={flow} filtered={filtered} onEdit={setEditing} onDelete={remove} />
          ) : (
            <RecordTable
              columns={COLUMNS[tab]}
              rows={rows}
              onEdit={setEditing}
              onDelete={remove}
              empty={{
                icon: Database,
                title: filtered ? 'No records match these filters' : `No ${tab} yet`,
                text: filtered ? 'Try different filters.' : 'Use the Add button to create the first one.',
              }}
            />
          )}
        </>
      )}

      {editing && (
        <Modal title={formTitle(tab, Boolean(editing.id))} onClose={() => setEditing(null)}>
          <FormFor
            table={tab}
            initial={editing.id ? editing : null}
            lookups={all}
            onSaved={(m) => { setEditing(null); toast(m); refresh() }}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </div>
  )
}
