import { useEffect, useState } from 'react';
import { Database, RefreshCcw, Search, Filter } from 'lucide-react';
import { adminApi } from '../../services/api';
import Sidebar from '../../components/shared/Sidebar';
import toast from 'react-hot-toast';

const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' }) : '—';

const ACTION_COLORS = {
  USER_REGISTERED:    'badge-success',
  LOGIN_ATTEMPT:      'badge-info',
  OTP_VERIFIED:       'badge-success',
  CREDIT:             'badge-success',
  DEBIT:              'badge-danger',
  TRANSFER:           'badge-info',
  WITHDRAWAL:         'badge-warning',
  LOAN_APPLIED:       'badge-purple',
  LOAN_APPROVED:      'badge-success',
  LOAN_DISBURSED:     'badge-success',
  ACCOUNT_CREATED:    'badge-info',
};

export default function AdminAuditPage() {
  const [logs, setLogs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  useEffect(() => { load(); }, []);
  useEffect(() => {
    let result = [...logs];
    if (actionFilter !== 'ALL') result = result.filter(l => l.action === actionFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        l.action?.toLowerCase().includes(q) ||
        l.user?.username?.toLowerCase().includes(q) ||
        l.details?.toLowerCase().includes(q) ||
        l.entityType?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [logs, search, actionFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getAuditLogs();
      setLogs(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch { toast.error('Failed to load audit logs'); }
    finally { setLoading(false); }
  };

  const uniqueActions = [...new Set(logs.map(l => l.action))];

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <div>
            <div className="page-title">AUDIT LOGS</div>
            <div className="page-subtitle">{logs.length} EVENTS RECORDED | IMMUTABLE TRAIL</div>
          </div>
          <button className="btn btn-ghost" onClick={load}><RefreshCcw size={14} />REFRESH</button>
        </div>

        <div className="page-body">
          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input className="input-field" placeholder="Search action, user, details..."
                value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 30 }} />
            </div>
            <select className="select-field" style={{ width: 220 }} value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
              <option value="ALL">All Actions</option>
              {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="card card-glow" style={{ overflowX: 'auto' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                <div className="spinner" style={{ width: 36, height: 36 }} />
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                <Database size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
                <div>No audit logs found.</div>
              </div>
            ) : (
              <table className="cyber-table">
                <thead>
                  <tr>
                    <th>#</th><th>Timestamp</th><th>User</th><th>Action</th>
                    <th>Entity</th><th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log, idx) => {
                    const badgeCls = ACTION_COLORS[log.action] || 'badge-info';
                    return (
                      <tr key={log.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>{filtered.length - idx}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{fmtDate(log.createdAt)}</td>
                        <td>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--cyan)' }}>{log.user?.username || 'system'}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>{log.user?.email || ''}</div>
                        </td>
                        <td><span className={`badge ${badgeCls}`}>{log.action}</span></td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                          {log.entityType && <span style={{ color: 'var(--text-secondary)' }}>{log.entityType}</span>}
                          {log.entityId && <span style={{ color: 'var(--text-dim)' }}> #{log.entityId}</span>}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.details || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
