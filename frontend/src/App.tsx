import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import AuthPage from './pages/AuthPage'
import SubmitPage from './pages/SubmitPage'
import SubmissionsPage from './pages/SubmissionsPage'
import SubmissionDetailPage from './pages/SubmissionDetailPage'
import DashboardPage from './pages/DashboardPage'

function Navbar() {
  const { user, logout } = useAuth()
  if (!user) return null
  return (
    <nav className="navbar">
      <div className="row" style={{ gap: 24, height: '100%' }}>
        <NavLink to="/dashboard" className="brand">
          <span className="brand-glyph">&lt;/&gt;</span>
          CodeLens
        </NavLink>
        <div className="nav-links">
          <NavLink to="/submit" className="nav-link">Submit</NavLink>
          <NavLink to="/submissions" className="nav-link">History</NavLink>
          <NavLink to="/dashboard" className="nav-link">Dashboard</NavLink>
        </div>
      </div>
      <div className="row" style={{ gap: 10 }}>
        <div className="row" style={{ gap: 8 }}>
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1f6feb, #8957e5)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: '#fff',
            }}
          >
            {(user.name || user.email)[0].toUpperCase()}
          </span>
          <span className="muted" style={{ fontSize: 13 }}>{user.name || user.email}</span>
        </div>
        <button onClick={logout} className="btn btn-danger-ghost" style={{ padding: '5px 10px' }}>
          Logout
        </button>
      </div>
    </nav>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 32, width: 220, marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 120, marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 120 }} />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" />
  return <>{children}</>
}

function AppRoutes() {
  const { user, loading } = useAuth()

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/login" element={loading ? null : user ? <Navigate to="/dashboard" /> : <AuthPage />} />
        <Route path="/submit" element={<ProtectedRoute><SubmitPage /></ProtectedRoute>} />
        <Route path="/submissions" element={<ProtectedRoute><SubmissionsPage /></ProtectedRoute>} />
        <Route path="/submissions/:id" element={<ProtectedRoute><SubmissionDetailPage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
