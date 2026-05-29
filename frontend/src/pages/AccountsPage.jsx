import { useEffect, useState } from 'react';
import { Plus, CreditCard, RefreshCcw, Shield, Zap } from 'lucide-react';
import { accountApi } from '../services/api';
import Sidebar from '../components/shared/Sidebar';
import toast from 'react-hot-toast';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0);

const ACCOUNT_TYPES = [
  { value: 'SAVINGS', label: 'Savings Account', desc: 'Earn interest on your deposits', rate: '4% p.a.', color: 'var(--cyan)' },
  { value: 'CURRENT', label: 'Current Account', desc: 'For business transactions', rate: 'No interest', color: 'var(--yellow)' },
];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedType, setSelectedType] = useState('SAVINGS');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { loadAccounts(); }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const { data } = await accountApi.getAll();
      setAccounts(data);
    } catch { toast.error('Failed to load accounts'); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      await accountApi.create({ accountType: selectedType });
      toast.success('New account created!');
      setShowCreate(false);
      loadAccounts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create account');
    } finally { setCreating(false); }
  };

  const totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <div>
            <div className="page-title">MY ACCOUNTS</div>
            <div className="page-subtitle">MANAGE BANK ACCOUNTS | ENCRYPTED</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost" onClick={loadAccounts}><RefreshCcw size={14} />REFRESH</button>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={14} />NEW ACCOUNT</button>
          </div>
        </div>

        <div className="page-body">
          {/* Total balance */}
          <div className="card card-glow" style={{ marginBottom: 24, background: 'linear-gradient(135deg, #0d1a2e, #0a1422)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', letterSpacing: 2, marginBottom: 6 }}>TOTAL PORTFOLIO BALANCE</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 900, color: 'var(--text-primary)' }}>{fmt(totalBalance)}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>{accounts.length} account{accounts.length !== 1 ? 's' : ''} active</div>
              </div>
              <Shield size={48} color="var(--cyan)" style={{ opacity: 0.3 }} />
            </div>
          </div>

          {/* Accounts grid */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" style={{ width: 36, height: 36 }} /></div>
          ) : (
            <div>
              <div className="section-title">Account List</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                {accounts.map((acc, idx) => (
                  <div key={acc.id} className="account-card" style={{ animationDelay: `${idx * 0.05}s` }}>
                    {/* Card type chip */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <div style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 2, padding: '3px 10px', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--cyan)', letterSpacing: 2 }}>
                        {acc.accountType}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: acc.isActive ? 'var(--green)' : 'var(--red)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: acc.isActive ? 'var(--green)' : 'var(--red)' }} />
                        {acc.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </div>
                    </div>

                    {/* Balance */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>AVAILABLE BALANCE</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 900, color: 'var(--text-primary)' }}>{fmt(acc.balance)}</div>
                    </div>

                    {/* Account details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>ACCOUNT NUMBER</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)', letterSpacing: 1 }}>{acc.accountNumber}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>IFSC CODE</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>{acc.ifscCode}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>OPENED</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                          {acc.createdAt ? new Date(acc.createdAt).toLocaleDateString('en-IN') : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Card number display */}
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)', letterSpacing: 3 }}>
                      {acc.accountNumber.match(/.{1,4}/g)?.join(' · ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create account modal */}
      {showCreate && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">
              <Plus size={18} />OPEN NEW ACCOUNT
              <button onClick={() => setShowCreate(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>

            <div className="input-group">
              <label className="input-label">Account Type</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ACCOUNT_TYPES.map(at => (
                  <div key={at.value}
                    onClick={() => setSelectedType(at.value)}
                    style={{
                      padding: '14px 16px', borderRadius: 3, cursor: 'pointer',
                      background: selectedType === at.value ? 'rgba(0,212,255,0.06)' : '#060d1a',
                      border: `1px solid ${selectedType === at.value ? at.color : 'var(--border)'}`,
                      transition: 'all 0.2s',
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: at.color, letterSpacing: 1 }}>{at.label}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', marginTop: 3 }}>{at.desc}</div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>{at.rate}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '10px 14px', background: 'rgba(0,212,255,0.05)', border: '1px solid var(--border)', borderRadius: 3, marginBottom: 20, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
              <Shield size={11} color="var(--cyan)" style={{ display: 'inline', marginRight: 5 }} />
              Your new account will be secured with 2FA and assigned a unique CYBR account number.
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowCreate(false)}>CANCEL</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleCreate} disabled={creating}>
                {creating ? <><span className="spinner" />CREATING...</> : <><Zap size={14} />OPEN ACCOUNT</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
