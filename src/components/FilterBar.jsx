import { Search } from 'lucide-react'
import { QUALITIES } from '../lib/schema'

export const emptyFilters = { search: '', quality: '', project: '', department: '', from: '', to: '', low: false }

// One search and filter bar, used on every page.
export default function FilterBar({ values, onChange, show = {}, projects = [], departments = [], searchPlaceholder = 'Search by name' }) {
  const set = (patch) => onChange({ ...values, ...patch })
  const deptOptions = departments.filter((d) => !values.project || !d.project_id || d.project_id === values.project)
  const active = JSON.stringify(values) !== JSON.stringify(emptyFilters)

  return (
    <div className="toolbar">
      <label className="search">
        <Search size={17} aria-hidden="true" />
        <input type="search" value={values.search} placeholder={searchPlaceholder} aria-label={searchPlaceholder} onChange={(e) => set({ search: e.target.value })} />
      </label>

      {show.quality && (
        <select value={values.quality} onChange={(e) => set({ quality: e.target.value })} aria-label="Quality">
          <option value="">Any quality</option>
          {QUALITIES.map((q) => <option key={q}>{q}</option>)}
        </select>
      )}
      {show.project && (
        <select value={values.project} onChange={(e) => set({ project: e.target.value, department: '' })} aria-label="Project">
          <option value="">All projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
      {show.department && (
        <select value={values.department} onChange={(e) => set({ department: e.target.value })} aria-label="Department">
          <option value="">All departments</option>
          {deptOptions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      )}
      {show.dates && (
        <>
          <label className="date-filter">From <input type="date" value={values.from} onChange={(e) => set({ from: e.target.value })} /></label>
          <label className="date-filter">To <input type="date" value={values.to} onChange={(e) => set({ to: e.target.value })} /></label>
        </>
      )}
      {show.low && (
        <label className="check">
          <input type="checkbox" checked={values.low} onChange={(e) => set({ low: e.target.checked })} /> Low stock only
        </label>
      )}
      {active && <button className="btn btn--ghost btn--sm" onClick={() => onChange(emptyFilters)}>Clear filters</button>}
    </div>
  )
}
