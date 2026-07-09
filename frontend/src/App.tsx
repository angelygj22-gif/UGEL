import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState, createContext, useContext, useEffect } from 'react'
import Layout from './components/Layout'
import Personal from './pages/Personal'
import Planillas from './pages/Planillas'
import Importar from './pages/Importar'
import Exportar from './pages/Exportar'
import Auth from './pages/Auth'

const AuthContext = createContext<{ isAuthenticated: boolean; login: (token: string, refreshToken: string, user: any) => void; logout: () => void }>({
  isAuthenticated: false,
  login: () => {},
  logout: () => {}
})

export const useAuth = () => useContext(AuthContext)

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }
  return <>{children}</>
}

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('access_token')
  })

  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark'
    if (isDark) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  const login = (token: string, refreshToken: string, user: any) => {
    localStorage.setItem('access_token', token)
    localStorage.setItem('refresh_token', refreshToken)
    localStorage.setItem('user_data', JSON.stringify(user))
    localStorage.setItem('isAuthenticated', 'true')
    setIsAuthenticated(true)
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_data')
    localStorage.removeItem('isAuthenticated')
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      <Routes>
        <Route path="/auth" element={isAuthenticated ? <Navigate to="/" replace /> : <Auth />} />
        <Route path="/reset-password" element={<Auth />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Planillas />} />
          <Route path="personal" element={<Personal />} />
          <Route path="planillas" element={<Planillas />} />
          <Route path="importar" element={<Importar />} />
          <Route path="exportar" element={<Exportar />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthContext.Provider>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App
