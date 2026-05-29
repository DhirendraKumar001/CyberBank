import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard, ArrowUpDown, TrendingUp, Wallet,
  ArrowUpRight, ArrowDownLeft, RefreshCcw, Plus, Activity
} from 'lucide-react';
import { accountApi, transactionApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/shared/Sidebar';
import toast from 'react-hot-toast';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);
const fmtDate = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });

function TxRow({ tx, currentAccountIds }) {
  const isIncoming = currentAccountIds.includes(tx.toAccount?.id);
  const color = isIncoming ? 'var(--green)' : 'var(--red)';
  const sign = isIncoming ? '+' : '-';
  const typeMap = { CREDIT: '↑ CREDIT', DEBIT: '↓ DEBIT', TRANSFER: '⇄ TRANSFER', WITHDRAWAL: '↓ WITHDRAW', LOAN_DISBURSEMENT: '⊕ LOAN', LOAN_REPAYMENT: '⊖ REPAY' };

  return (
    <tr>
      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{tx.transactionId?.slice(0, 16)}…</td>
      <td><span className={`badge ${isIncoming ? 'badge-success' : 'badge-danger'}`}>{typeMap[tx.transactionType] || tx.transactionType}</span></td>
      <td style={{ color, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{sign}{fmt(tx.amount)}</td>
      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>{fmtDate(tx.createdAt)}</td>
      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description || '—'}</td>
    </tr>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [txHistory, setTxHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: accs } = await accountApi.getAll();
      // Normalize — backend may return array directly or wrapped
      const accList = Array.isArray(accs) ? accs : [];
      setAccounts(accList);

      // Only fetch history if we have a valid numeric account id
      if (accList.length > 0 && accList[0]?.id) {
        try {
          const { data: txs } = await transactionApi.history(accList[0].id);
          setTxHistory(Array.isArray(txs) ? txs.slice(0, 10) : []);
        } catch {
          // History fetch failing should not crash the whole dashboard
          setTxHistory([]);
        }
      }
    } catch (err) {
      console.error('[Dashboard] fetchData error:', err);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0);
  const accountIds = accounts.map(a => a.id);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <div>
            <div className="page-title">DASHBOARD</div>
            <div className="page-subtitle">SYSTEM STATUS: <span style={{ color: 'var(--green)' }}>OPERATIONAL</span> | USER: {user?.username?.toUpperCase()}</div>
          </div>
          <button className="btn btn-ghost" onClick={fetchData} style={{ gap: 6 }}>
            <RefreshCcw size={14} />REFRESH
          </button>
        </div>

        <div className="page-body">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
              <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="stat-grid">
                <div className="stat-card cyan">
                  <div className="stat-icon cyan"><Wallet size={20} /></div>
                  <div className="stat-value">{fmt(totalBalance)}</div>
                  <div className="stat-label">Total Balance</div>
                </div>
                <div className="stat-card green">
                  <div className="stat-icon green"><CreditCard size={20} /></div>
                  <div className="stat-value">{accounts.length}</div>
                  <div className="stat-label">Active Accounts</div>
                </div>
                <div className="stat-card yellow">
                  <div className="stat-icon yellow"><Activity size={20} /></div>
                  <div className="stat-value">{txHistory.length}</div>
                  <div className="stat-label">Recent Transactions</div>
                </div>
                <div className="stat-card red">
                  <div className="stat-icon red"><TrendingUp size={20} /></div>
                  <div className="stat-value">₹0</div>
                  <div className="stat-label">Active Loans</div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="section-title">Quick Actions</div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
                {[
                  { label: 'SEND MONEY', icon: ArrowUpRight, color: 'btn-primary', to: '/transactions?type=transfer' },
                  { label: 'ADD FUNDS', icon: ArrowDownLeft, color: 'btn-success', to: '/transactions?type=credit' },
                  { label: 'WITHDRAW', icon: ArrowUpDown, color: 'btn-danger', to: '/transactions?type=withdraw' },
                  { label: 'APPLY LOAN', icon: TrendingUp, color: 'btn-ghost', to: '/loans' },
                  { label: 'NEW ACCOUNT', icon: Plus, color: 'btn-ghost', to: '/accounts' },
                ].map(({ label, icon: Icon, color, to }) => (
                  <button key={label} className={`btn ${color}`} onClick={() => navigate(to)}>
                    <Icon size={14} />{label}
                  </button>
                ))}
              </div>

              {/* Accounts */}
              <div className="section-title">My Accounts</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 32 }}>
                {accounts.map(acc => (
                  <div key={acc.id} className="account-card" onClick={() => navigate('/accounts')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: 2, textTransform: 'uppercase' }}>
                          {acc.accountType} ACCOUNT
                        </div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--cyan)', marginTop: 4, letterSpacing: 1 }}>
                          {acc.accountNumber}
                        </div>
                      </div>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,212,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CreditCard size={18} color="var(--cyan)" />
                      </div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8 }}>
                      {fmt(acc.balance)}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>
                      IFSC: {acc.ifscCode} &nbsp;|&nbsp; <span style={{ color: acc.isActive ? 'var(--green)' : 'var(--red)' }}>● {acc.isActive ? 'ACTIVE' : 'INACTIVE'}</span>
                    </div>
                  </div>
                ))}
                <div className="account-card" onClick={() => navigate('/accounts')}
                  style={{ border: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 130, cursor: 'pointer', opacity: 0.6 }}>
                  <Plus size={24} color="var(--cyan)" />
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>Open New Account</div>
                </div>
              </div>

              {/* Transaction History */}
              <div className="section-title">Recent Transactions</div>
              <div className="card card-glow" style={{ overflowX: 'auto' }}>
                {txHistory.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', fontSize: 13 }}>
                    <Activity size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
                    <div>No transactions yet.</div>
                  </div>
                ) : (
                  <table className="cyber-table">
                    <thead>
                      <tr>
                        <th>TXN ID</th><th>Type</th><th>Amount</th><th>Date</th><th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {txHistory.map(tx => <TxRow key={tx.id} tx={tx} currentAccountIds={accountIds} />)}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
