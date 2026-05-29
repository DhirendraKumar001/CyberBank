import { useEffect, useState } from 'react';
import { Users, Search, UserCheck, UserX, RefreshCcw, Shield } from 'lucide-react';
import { adminApi } from '../../services/api';
import Sidebar from '../../components/shared/Sidebar';
import toast from 'react-hot-toast';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState(null);

  useEffect(() => { loadUsers(); }, []);
  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(users.filter(u =>
      u.username?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.fullName?.toLowerCase().includes(q) ||
      u.phone?.includes(q)
    ));
  }, [search, users]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getUsers();
      setUsers(data);
      setFiltered(data);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  const toggleStatus = async (id) => {
    setToggling(id);
    try {
      const { data } = await adminApi.toggleUserStatus(id);
      setUsers(u => u.map(user => user.id === id ? { ...user, isActive: data.isActive } : user));
      toast.success(`User ${data.isActive ? 'activated' : 'deactivated'}`);
    } catch { toast.error('Failed to toggle status'); }
    finally { setToggling(null); }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <div>
            <div className="page-title">USER MANAGEMENT</div>
            <div className="page-subtitle">{filtered.length} USERS IN SYSTEM | ADMIN ACCESS</div>
          </div>
          <button className="btn btn-ghost" onClick={loadUsers}><RefreshCcw size={14} />REFRESH</button>
        </div>

        <div className="page-body">
          {/* Search */}
          <div style={{ position: 'relative', maxWidth: 400, marginBottom: 24 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input className="input-field" placeholder="Search by name, email, phone..."
              value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
          </div>

          <div className="card card-glow" style={{ overflowX: 'auto' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                <div className="spinner" style={{ width: 36, height: 36 }} />
              </div>
            ) : (
              <table className="cyber-table">
                <thead>
                  <tr>
                    <th>#ID</th>
                    <th>User</th>
                    <th>Contact</th>
                    <th>Role</th>
                    <th>Accounts</th>
                    <th>Total Balance</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>#{u.id}</td>
                      <td>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{u.username}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{u.fullName}</div>
                      </td>
                      <td>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--cyan)' }}>{u.email}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{u.phone}</div>
                      </td>
                      <td>
                        <span className={`badge ${u.role === 'ADMIN' ? 'badge-danger' : 'badge-info'}`}>
                          {u.role === 'ADMIN' && <Shield size={10} />}
                          {u.role}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', textAlign: 'center' }}>{u.accountCount}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan)' }}>{fmt(u.totalBalance)}</td>
                      <td>
                        <span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>
                          {u.isActive ? '● ACTIVE' : '○ DISABLED'}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>{fmtDate(u.createdAt)}</td>
                      <td>
                        {u.role !== 'ADMIN' && (
                          <button
                            className={`btn ${u.isActive ? 'btn-danger' : 'btn-success'}`}
                            style={{ padding: '5px 12px', fontSize: 10 }}
                            onClick={() => toggleStatus(u.id)}
                            disabled={toggling === u.id}
                          >
                            {toggling === u.id ? <span className="spinner" style={{ width: 12, height: 12 }} /> :
                              u.isActive ? <><UserX size={12} />DISABLE</> : <><UserCheck size={12} />ENABLE</>}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
