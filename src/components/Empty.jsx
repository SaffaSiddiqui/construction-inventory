import { Package } from 'lucide-react'

export default function Empty({ icon: Icon = Package, title, text, action }) {
  return (
    <div className="empty">
      <Icon size={34} />
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  )
}
