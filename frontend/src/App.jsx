import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, GuestRoute } from './components/shared/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AccountsPage from './pages/AccountsPage';
import TransactionsPage from './pages/TransactionsPage';
import LoansPage from './pages/LoansPage';
import HistoryPage from './pages/HistoryPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminLoansPage from './pages/admin/AdminLoansPage';
import AdminKycPage from './pages/admin/AdminKycPage';
import AdminTransactionsPage from './pages/admin/AdminTransactionsPage';
import AdminAuditPage from './pages/admin/AdminAuditPage';

import './styles/global.css';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0d1426',
              color: '#e0e8ff',
              border: '1px solid #1a2744',
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: '13px',
              borderRadius: '3px',
            },
            success: { iconTheme: { primary: '#00ff88', secondary: '#0d1426' }, style: { borderColor: 'rgba(0,255,136,0.3)' } },
            error:   { iconTheme: { primary: '#ff3366', secondary: '#0d1426' }, style: { borderColor: 'rgba(255,51,102,0.3)' } },
          }}
        />
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login"    element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

          <Route path="/dashboard"   element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/accounts"    element={<ProtectedRoute><AccountsPage /></ProtectedRoute>} />
          <Route path="/transactions"element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>} />
          <Route path="/loans"       element={<ProtectedRoute><LoansPage /></ProtectedRoute>} />
          <Route path="/history"     element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />

          <Route path="/admin"              element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users"        element={<ProtectedRoute adminOnly><AdminUsersPage /></ProtectedRoute>} />
          <Route path="/admin/loans"        element={<ProtectedRoute adminOnly><AdminLoansPage /></ProtectedRoute>} />
          <Route path="/admin/kyc"          element={<ProtectedRoute adminOnly><AdminKycPage /></ProtectedRoute>} />
          <Route path="/admin/transactions" element={<ProtectedRoute adminOnly><AdminTransactionsPage /></ProtectedRoute>} />
          <Route path="/admin/audit"        element={<ProtectedRoute adminOnly><AdminAuditPage /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
