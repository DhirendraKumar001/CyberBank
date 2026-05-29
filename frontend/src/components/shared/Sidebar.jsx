import { NavLink, useNavigate } from 'react-router-dom';
import {
  Shield, LayoutDashboard, CreditCard, ArrowUpDown,
  TrendingUp, FileText, Settings, LogOut, Users,
  Activity, CheckSquare, Database, Terminal, Zap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const userNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/accounts', icon: CreditCard, label: 'Accounts' },
  { to: '/transactions', icon: ArrowUpDown, label: 'Transactions' },
  { to: '/loans', icon: TrendingUp, label: 'Loans' },
  { to: '/history', icon: FileText, label: 'History' },
];

const adminNav = [
  { to: '/admin', icon: LayoutDashboard, label: 'Overview', end: true },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/loans', icon: TrendingUp, label: 'Loan Mgmt' },
  { to: '/admin/kyc', icon: CheckSquare, label: 'KYC Review' },
  { to: '/admin/transactions', icon: Activity, label: 'Transactions' },
  { to: '/admin/audit', icon: Database, label: 'Audit Logs' },
];

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = isAdmin ? adminNav : userNav;

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Shield size={24} color="var(--cyan)" style={{ filter: 'drop-shadow(0 0 6px var(--cyan))' }} />
          <div>
            <h1>CYBERBANK</h1>
            <span>{isAdmin ? '[ ADMIN CONSOLE ]' : '[ SECURE PORTAL ]'}</span>
          </div>
        </div>
      </div>

      {/* User info */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,212,255,0.1)', border: '1px solid var(--cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Terminal size={16} color="var(--cyan)" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
              {user?.username || 'user'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 4px var(--green)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--green)' }}>
                {isAdmin ? 'ADMIN' : 'ACTIVE'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section">{isAdmin ? 'Admin Panel' : 'Navigation'}</div>
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{ padding: '16px 0', borderTop: '1px solid var(--border)' }}>
        <div className="nav-section">System</div>
        <button className="nav-item" onClick={handleLogout} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
          <LogOut size={18} />
          Disconnect
        </button>
      </div>

      {/* System status bar */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Zap size={10} color="var(--green)" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: 1 }}>
            ENCRYPTION: AES-256 ACTIVE
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cyan)', animation: 'pulse-glow 2s infinite' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: 1 }}>
            2FA: ENABLED
          </span>
        </div>
      </div>
    </aside>
  );
}
