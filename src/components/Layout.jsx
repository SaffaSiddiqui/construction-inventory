import { NavLink, Outlet } from 'react-router-dom'
import { Boxes, Database, HardHat, LogOut, PackageMinus, PackagePlus } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { COMPANY_NAME } from '../lib/schema'

const MAIN = [
  { to: '/receive', label: 'Receive', hint: 'Material coming in', icon: PackagePlus, tone: 'receive' },
  { to: '/issue', label: 'Issue', hint: 'Material going out', icon: PackageMinus, tone: 'issue' },
  { to: '/total', label: 'Total Products', hint: 'What is in the store', icon: Boxes, tone: 'total' },
]
const MORE = [
  { to: '/projects', label: 'Projects', icon: HardHat, tone: 'more' },
  { to: '/database', label: 'Database', icon: Database, tone: 'more' },
]

function Item({ to, label, hint, icon: Icon, tone }) {
  return (
    <NavLink to={to} className={({ isActive }) => `nav-link nav-link--${tone} ${isActive ? 'is-active' : ''}`}>
      <Icon size={20} />
      <span className="nav-text">
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </span>
    </NavLink>
  )
}

export default function Layout() {
  const { signOut } = useAuth()
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><HardHat size={22} /></div>
          <span>{COMPANY_NAME}</span>
        </div>
        <nav className="nav" aria-label="Main">
          {MAIN.map((i) => <Item key={i.to} {...i} />)}
        </nav>
        <nav className="nav nav--more" aria-label="More">
          {MORE.map((i) => <Item key={i.to} {...i} />)}
        </nav>
        <button className="signout" onClick={signOut}><LogOut size={18} /><span>Sign out</span></button>
      </aside>
      <div className="topbar">
        <div className="brand"><div className="brand-mark"><HardHat size={18} /></div><span>{COMPANY_NAME}</span></div>
        <button className="icon-btn" onClick={signOut} aria-label="Sign out"><LogOut size={18} /></button>
      </div>
      <main className="main"><Outlet /></main>
    </div>
  )
}
