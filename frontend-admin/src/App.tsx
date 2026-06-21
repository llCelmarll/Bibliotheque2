import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Reports from '@/pages/Reports'
import Users from '@/pages/Users'
import Entities from '@/pages/Entities'
import Whitelist from '@/pages/Whitelist'
import AuditLog from '@/pages/AuditLog'
import Books from '@/pages/Books'
import Loans from '@/pages/Loans'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="reports" element={<Reports />} />
          <Route path="users" element={<Users />} />
          <Route path="entities" element={<Entities />} />
          <Route path="books" element={<Books />} />
          <Route path="loans" element={<Loans />} />
          <Route
            path="whitelist"
            element={
              <ProtectedRoute requireAdmin>
                <Whitelist />
              </ProtectedRoute>
            }
          />
          <Route
            path="audit-log"
            element={
              <ProtectedRoute requireAdmin>
                <AuditLog />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
