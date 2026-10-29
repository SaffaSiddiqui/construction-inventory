export default function PageHeader({ title, subtitle, action }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && <div className="page-head-action">{action}</div>}
    </header>
  )
}
