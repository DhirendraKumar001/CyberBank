import { useEffect, useState } from 'react';
import { FileText, RefreshCcw, Search, Filter } from 'lucide-react';
import { accountApi, transactionApi } from '../services/api';
import Sidebar from '../components/shared/Sidebar';
import toast from 'react-hot-toast';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0);
const fmtDate = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

const TYPE_BADGE = {
  CREDIT:           { label: '↑ CREDIT',         cls: 'badge-success' },
  DEBIT:            { label: '↓ DEBIT',           cls: 'badge-danger' },
  TRANSFER:         { label: '⇄ TRANSFER',         cls: 'badge-info' },
  WITHDRAWAL:       { label: '↓ WITHDRAWAL',       cls: 'badge-danger' },
  LOAN_DISBURSEMENT:{ label: '⊕ LOAN DISBURSE',   cls: 'badge-purple' },
  LOAN_REPAYMENT:   { label: '⊖ LOAN REPAY',      cls: 'badge-warning' },
};

export default function HistoryPage() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAcc, setSelectedAcc] = useState(null);
  const [txList, setTxList] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  useEffect(() => { loadAccounts(); }, []);
  useEffect(() => { if (selectedAcc) loadHistory(); }, [selectedAcc]);
  useEffect(() => { applyFilters(); }, [txList, search, typeFilter]);

  const loadAccounts = async () => {
    try {
      const { data } = await accountApi.getAll();
      setAccounts(data);
      if (data.length > 0) setSelectedAcc(data[0]);
    } catch { toast.error('Failed to load accounts'); }
  };

  const loadHistory = async () => {
    if (!selectedAcc?.id) return;   // guard — never call with undefined
    setLoading(true);
    try {
      const { data } = await transactionApi.history(selectedAcc.id);
      setTxList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[History] loadHistory error:', err);
      toast.error('Failed to load history');
    } finally { setLoading(false); }
  };

  const applyFilters = () => {
    let result = [...txList];
    if (typeFilter !== 'ALL') result = result.filter(t => t.transactionType === typeFilter);
    if (search) result = result.filter(t =>
      t.transactionId?.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase())
    );
    setFiltered(result);
  };

  const credits = txList.filter(t => ['CREDIT', 'LOAN_DISBURSEMENT'].includes(t.transactionType) || (t.transactionType === 'TRANSFER' && t.toAccount?.id === selectedAcc?.id));
  const debits  = txList.filter(t => ['DEBIT', 'WITHDRAWAL', 'LOAN_REPAYMENT'].includes(t.transactionType) || (t.transactionType === 'TRANSFER' && t.fromAccount?.id === selectedAcc?.id));
  const totalIn  = credits.reduce((s, t) => s + (t.amount || 0), 0);
  const totalOut = debits.reduce((s, t) => s + (t.amount || 0), 0);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <div>
            <div className="page-title">TRANSACTION HISTORY</div>
            <div className="page-subtitle">COMPLETE FINANCIAL LEDGER | AUDIT TRAIL</div>
          </div>
          <button className="btn btn-ghost" onClick={loadHistory}><RefreshCcw size={14} />REFRESH</button>
        </div>

        <div className="page-body">
          {/* Account selector */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
            {accounts.map(acc => (
              <button key={acc.id}
                className={`btn ${selectedAcc?.id === acc.id ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setSelectedAcc(acc)}
                style={{ fontSize: 12 }}>
                {acc.accountNumber} ({acc.accountType})
              </button>
            ))}
          </div>

          {/* Stats */}
          {selectedAcc && (
            <div className="stat-grid" style={{ marginBottom: 24 }}>
              <div className="stat-card cyan">
                <div className="stat-icon cyan"><FileText size={18} /></div>
                <div className="stat-value">{txList.length}</div>
                <div className="stat-label">Total Transactions</div>
              </div>
              <div className="stat-card green">
                <div className="stat-icon green"><span style={{ fontSize: 16 }}>↑</span></div>
                <div className="stat-value" style={{ fontSize: 18 }}>{fmt(totalIn)}</div>
                <div className="stat-label">Total Credits</div>
              </div>
              <div className="stat-card red">
                <div className="stat-icon red"><span style={{ fontSize: 16 }}>↓</span></div>
                <div className="stat-value" style={{ fontSize: 18 }}>{fmt(totalOut)}</div>
                <div className="stat-label">Total Debits</div>
              </div>
              <div className="stat-card yellow">
                <div className="stat-icon yellow"><span style={{ fontSize: 16 }}>⊕</span></div>
                <div className="stat-value" style={{ fontSize: 18 }}>{fmt(selectedAcc.balance)}</div>
                <div className="stat-label">Current Balance</div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input className="input-field" placeholder="Search TXN ID or description..." value={search}
                onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
            </div>
            <select className="select-field" style={{ width: 180 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="ALL">All Types</option>
              {Object.keys(TYPE_BADGE).map(k => <option key={k} value={k}>{TYPE_BADGE[k].label}</option>)}
            </select>
          </div>

          {/* Table */}
          <div className="card card-glow" style={{ overflowX: 'auto' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                <div className="spinner" style={{ width: 36, height: 36 }} />
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', fontSize: 13 }}>
                <FileText size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
                <div>{txList.length === 0 ? 'No transactions found.' : 'No results match your filter.'}</div>
              </div>
            ) : (
              <table className="cyber-table">
                <thead>
                  <tr>
                    <th>TXN ID</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Balance After</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Date & Time</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(tx => {
                    const badge = TYPE_BADGE[tx.transactionType] || { label: tx.transactionType, cls: 'badge-info' };
                    const isIncoming = ['CREDIT', 'LOAN_DISBURSEMENT'].includes(tx.transactionType) ||
                      (tx.transactionType === 'TRANSFER' && tx.toAccount?.id === selectedAcc?.id);
                    return (
                      <tr key={tx.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>{tx.transactionId}</td>
                        <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: isIncoming ? 'var(--green)' : 'var(--red)', whiteSpace: 'nowrap' }}>
                          {isIncoming ? '+' : '-'}{fmt(tx.amount)}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--cyan)' }}>{tx.balanceAfter != null ? fmt(tx.balanceAfter) : '—'}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>{tx.fromAccount?.accountNumber || '—'}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>{tx.toAccount?.accountNumber || '—'}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{fmtDate(tx.createdAt)}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description || '—'}</td>
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
