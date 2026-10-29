export const TABS = [
  { key: 'products', label: 'Products' },
  { key: 'receives', label: 'Receives' },
  { key: 'issues', label: 'Issues' },
  { key: 'projects', label: 'Projects' },
  { key: 'departments', label: 'Departments' },
]

export default function TableTabs({ tab, onChange, counts }) {
  return (
    <div className="tabs" role="tablist" aria-label="Tables">
      {TABS.map((t) => (
        <button key={t.key} role="tab" aria-selected={tab === t.key} className={`tab ${tab === t.key ? 'is-active' : ''}`} onClick={() => onChange(t.key)}>
          {t.label}
          <span className="tab-count">{counts[t.key] ?? 0}</span>
        </button>
      ))}
    </div>
  )
}
