import { useEffect, useState } from 'react';
import { TrendingUp, CheckCircle, Zap, RefreshCcw, Clock, AlertCircle } from 'lucide-react';
import { adminApi } from '../../services/api';
import Sidebar from '../../components/shared/Sidebar';
import toast from 'react-hot-toast';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—';

const STATUS_COLORS = {
  APPLIED:      { color: 'var(--yellow)', cls: 'badge-warning' },
  UNDER_REVIEW: { color: 'var(--cyan)',   cls: 'badge-info' },
  APPROVED:     { color: 'var(--green)',  cls: 'badge-success' },
  DISBURSED:    { color: 'var(--cyan)',   cls: 'badge-info' },
  CLOSED:       { color: 'var(--text-dim)', cls: 'badge-info' },
  REJECTED:     { color: 'var(--red)',    cls: 'badge-danger' },
};

export default function AdminLoansPage() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => { loadLoans(); }, []);

  const loadLoans = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getLoans();
      setLoans(data);
    } catch { toast.error('Failed to load loans'); }
    finally { setLoading(false); }
  };

  const handleApprove = async (id) => {
    setActionLoading(id + '_approve');
    try {
      await adminApi.approveLoan(id);
      toast.success('Loan approved!');
      loadLoans();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to approve'); }
    finally { setActionLoading(null); }
  };

  const handleDisburse = async (id) => {
    setActionLoading(id + '_disburse');
    try {
      await adminApi.disburseLoan(id);
      toast.success('Loan disbursed! Amount credited to account.');
      loadLoans();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to disburse'); }
    finally { setActionLoading(null); }
  };

  const filtered = filter === 'ALL' ? loans : loans.filter(l => l.status === filter);

  const counts = {};
  loans.forEach(l => { counts[l.status] = (counts[l.status] || 0) + 1; });

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <div>
            <div className="page-title">LOAN MANAGEMENT</div>
            <div className="page-subtitle">REVIEW & APPROVE LOAN APPLICATIONS</div>
          </div>
          <button className="btn btn-ghost" onClick={loadLoans}><RefreshCcw size={14} />REFRESH</button>
        </div>

        <div className="page-body">
          {/* Status filters */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
            {['ALL', 'APPLIED', 'UNDER_REVIEW', 'APPROVED', 'DISBURSED', 'REJECTED'].map(s => (
              <button key={s}
                className={`btn ${filter === s ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: 11 }}
                onClick={() => setFilter(s)}>
                {s} {s !== 'ALL' && counts[s] ? `(${counts[s]})` : ''}
              </button>
            ))}
          </div>

          <div className="card card-glow" style={{ overflowX: 'auto' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                <div className="spinner" style={{ width: 36, height: 36 }} />
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                <TrendingUp size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
                <div>No loans in this category.</div>
              </div>
            ) : (
              <table className="cyber-table">
                <thead>
                  <tr>
                    <th>Loan ID</th>
                    <th>Applicant</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>EMI</th>
                    <th>Tenure</th>
                    <th>Rate</th>
                    <th>Status</th>
                    <th>Applied</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(loan => {
                    const sc = STATUS_COLORS[loan.status] || STATUS_COLORS.APPLIED;
                    return (
                      <tr key={loan.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--cyan)' }}>{loan.loanId}</td>
                        <td>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)' }}>{loan.user?.username || '—'}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>{loan.user?.email || ''}</div>
                        </td>
                        <td><span className="badge badge-purple">{loan.loanType}</span></td>
                        <td style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(loan.principalAmount)}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan)' }}>{fmt(loan.emiAmount)}/mo</td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{loan.tenureMonths}m</td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--yellow)' }}>{loan.interestRate}%</td>
                        <td><span className={`badge ${sc.cls}`}>{loan.status}</span></td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>{fmtDate(loan.appliedAt)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {loan.status === 'APPLIED' && (
                              <button className="btn btn-success" style={{ padding: '5px 10px', fontSize: 10 }}
                                onClick={() => handleApprove(loan.id)}
                                disabled={actionLoading === loan.id + '_approve'}>
                                {actionLoading === loan.id + '_approve' ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <><CheckCircle size={11} />APPROVE</>}
                              </button>
                            )}
                            {loan.status === 'APPROVED' && (
                              <button className="btn btn-primary" style={{ padding: '5px 10px', fontSize: 10 }}
                                onClick={() => handleDisburse(loan.id)}
                                disabled={actionLoading === loan.id + '_disburse'}>
                                {actionLoading === loan.id + '_disburse' ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <><Zap size={11} />DISBURSE</>}
                              </button>
                            )}
                          </div>
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
