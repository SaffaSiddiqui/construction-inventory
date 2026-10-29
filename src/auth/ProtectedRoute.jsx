import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { DataProvider } from '../context/Data'
import Layout from '../components/Layout'

export default function ProtectedRoute() {
  const { authed, loading } = useAuth()
  if (loading) return <div className="splash">Loading…</div>
  if (!authed) return <Navigate to="/login" replace />
  return (
    <DataProvider>
      <Layout />
    </DataProvider>
  )
}
