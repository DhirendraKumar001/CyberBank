import { useEffect, useState } from 'react';
import { Activity, RefreshCcw, Search, Download } from 'lucide-react';
import { adminApi } from '../../services/api';
import Sidebar from '../../components/shared/Sidebar';
import toast from 'react-hot-toast';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—';

const TYPE_BADGE = {
  CREDIT:             { label: '↑ CREDIT',        cls: 'badge-success' },
  DEBIT:              { label: '↓ DEBIT',          cls: 'badge-danger' },
  TRANSFER:           { label: '⇄ TRANSFER',        cls: 'badge-info' },
  WITHDRAWAL:         { label: '↓ WITHDRAW',        cls: 'badge-danger' },
  LOAN_DISBURSEMENT:  { label: '⊕ LOAN DISBURSE',  cls: 'badge-purple' },
  LOAN_REPAYMENT:     { label: '⊖ LOAN REPAY',     cls: 'badge-warning' },
};

const STATUS_BADGE = {
  SUCCESS: 'badge-success',
  PENDING: 'badge-warning',
  FAILED:  'badge-danger',
  REVERSED:'badge-info',
};

export default function AdminTransactionsPage() {
  const [txns, setTxns] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  useEffect(() => { load(); }, []);
  useEffect(() => {
    let result = [...txns];
    if (typeFilter !== 'ALL') result = result.filter(t => t.transactionType === typeFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.transactionId?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.fromAccount?.accountNumber?.includes(q) ||
        t.toAccount?.accountNumber?.includes(q)
      );
    }
    setFiltered(result);
  }, [txns, search, typeFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getTransactions();
      // Sort newest first
      setTxns(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch { toast.error('Failed to load transactions'); }
    finally { setLoading(false); }
  };

  const totalVolume = txns.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

  const exportCsv = () => {
    const rows = [
      ['TXN ID', 'Type', 'Amount', 'Status', 'From', 'To', 'Date', 'Description'],
      ...filtered.map(t => [
        t.transactionId, t.transactionType, t.amount, t.status,
        t.fromAccount?.accountNumber || '', t.toAccount?.accountNumber || '',
        fmtDate(t.createdAt), t.description || ''
      ])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'transactions.csv'; a.click();
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <div>
            <div className="page-title">ALL TRANSACTIONS</div>
            <div className="page-subtitle">
              {txns.length} TOTAL | VOLUME: {fmt(totalVolume)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={exportCsv}><Download size={14} />EXPORT CSV</button>
            <button className="btn btn-ghost" onClick={load}><RefreshCcw size={14} />REFRESH</button>
          </div>
        </div>

        <div className="page-body">
          {/* Stats row */}
          <div className="stat-grid" style={{ marginBottom: 24 }}>
            {['CREDIT','DEBIT','TRANSFER','WITHDRAWAL'].map(type => {
              const count = txns.filter(t => t.transactionType === type).length;
              const vol = txns.filter(t => t.transactionType === type).reduce((s,t) => s + parseFloat(t.amount||0), 0);
              return (
                <div key={type} className="card" style={{ padding: '14px 16px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>{type}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{count}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)', marginTop: 2 }}>{fmt(vol)}</div>
                </div>
              );
            })}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input className="input-field" placeholder="Search TXN ID, account, description..."
                value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 30 }} />
            </div>
            <select className="select-field" style={{ width: 200 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="ALL">All Types</option>
              {Object.keys(TYPE_BADGE).map(k => <option key={k} value={k}>{TYPE_BADGE[k].label}</option>)}
            </select>
          </div>

          <div className="card card-glow" style={{ overflowX: 'auto' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                <div className="spinner" style={{ width: 36, height: 36 }} />
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                <Activity size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
                <div>No transactions found.</div>
              </div>
            ) : (
              <table className="cyber-table">
                <thead>
                  <tr>
                    <th>TXN ID</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>From Account</th>
                    <th>To Account</th>
                    <th>Date</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(tx => {
                    const badge = TYPE_BADGE[tx.transactionType] || { label: tx.transactionType, cls: 'badge-info' };
                    const sBadge = STATUS_BADGE[tx.status] || 'badge-info';
                    return (
                      <tr key={tx.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{tx.transactionId}</td>
                        <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                        <td style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{fmt(tx.amount)}</td>
                        <td><span className={`badge ${sBadge}`}>{tx.status}</span></td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>{tx.fromAccount?.accountNumber || '—'}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>{tx.toAccount?.accountNumber || '—'}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{fmtDate(tx.createdAt)}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description || '—'}</td>
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
