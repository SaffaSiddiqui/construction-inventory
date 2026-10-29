import { useMemo, useState } from 'react'
import { PackageMinus } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import FilterBar, { emptyFilters } from '../components/FilterBar'
import RecordTable from '../components/RecordTable'
import Modal from '../components/Modal'
import IssueForm from '../components/forms/IssueForm'
import { issueColumns } from '../components/columns'
import { useData } from '../context/Data'
import { runDelete, useFeedback } from '../context/Feedback'
import { enrichIssues } from '../lib/enrich'
import { deleteIssue } from '../lib/inventory'
import { fmtDate, today } from '../lib/format'

export default function Issue() {
  const { data, loading, error, reload } = useData()
  const { toast, confirm } = useFeedback()
  const [filters, setFilters] = useState(emptyFilters)
  const [editing, setEditing] = useState(null)

  const all = useMemo(() => enrichIssues(data), [data])
  const rows = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
    return all.filter(
      (r) =>
        (!q || r.product_name?.toLowerCase().includes(q) || r.issued_to?.toLowerCase().includes(q)) &&
        (!filters.project || r.project_id === filters.project) &&
        (!filters.department || r.department_id === filters.department) &&
        (!filters.from || r.issue_date >= filters.from) &&
        (!filters.to || r.issue_date <= filters.to)
    )
  }, [all, filters])

  const thisMonth = all.filter((r) => r.issue_date?.startsWith(today().slice(0, 7))).length
  const projectsServed = new Set(all.map((r) => r.project_id)).size

  const remove = (r) =>
    runDelete({
      confirm, toast,
      title: 'Delete this issue record?',
      message: `${r.product_name} issued to ${r.project_name || 'a project'} on ${fmtDate(r.issue_date)} will be removed, and the material goes back into stock.`,
      confirmLabel: 'Delete issue',
      action: () => deleteIssue(r.id),
      done: reload,
    })

  return (
    <div className="page page--issue">
      <PageHeader
        title="Issue"
        subtitle="Material given out to projects and departments."
        action={<button className="btn btn--primary" onClick={() => setEditing({})}><PackageMinus size={18} /> Issue material</button>}
      />
      <div className="stats">
        <StatCard label="Issues recorded" value={all.length} />
        <StatCard label="Issued this month" value={thisMonth} note="issues" />
        <StatCard label="Projects supplied" value={projectsServed} note={`of ${data.projects.length} projects`} />
      </div>

      <FilterBar
        values={filters}
        onChange={setFilters}
        show={{ project: true, department: true, dates: true }}
        projects={data.projects}
        departments={data.departments}
        searchPlaceholder="Search material or person"
      />

      {error && <p className="form-error">Could not load records: {error}</p>}
      {loading ? (
        <p className="loading">Loading issues…</p>
      ) : (
        <RecordTable
          columns={issueColumns}
          rows={rows}
          onEdit={setEditing}
          onDelete={remove}
          empty={{
            icon: PackageMinus,
            title: all.length ? 'No issues match these filters' : 'Nothing issued yet',
            text: all.length ? 'Try a different project, department or date range.' : 'Issue material to a project and it will show up here.',
          }}
        />
      )}

      {editing && (
        <Modal title={editing.id ? 'Edit issue' : 'Issue material'} onClose={() => setEditing(null)}>
          <IssueForm
            initial={editing.id ? editing : null}
            products={data.products}
            projects={data.projects}
            departments={data.departments}
            onSaved={(m) => { setEditing(null); toast(m); reload() }}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </div>
  )
}
