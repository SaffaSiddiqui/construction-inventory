import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { FeedbackProvider } from './context/Feedback'
import Login from './auth/Login'
import ProtectedRoute from './auth/ProtectedRoute'
import Receive from './pages/Receive'
import Issue from './pages/Issue'
import TotalProducts from './pages/TotalProducts'
import Projects from './pages/Projects'
import DatabasePage from '../database/page/DatabasePage'

export default function App() {
  return (
    <AuthProvider>
      <FeedbackProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/receive" element={<Receive />} />
            <Route path="/issue" element={<Issue />} />
            <Route path="/total" element={<TotalProducts />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/database" element={<DatabasePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/total" replace />} />
        </Routes>
      </FeedbackProvider>
    </AuthProvider>
  )
}
