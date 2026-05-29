import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowUpRight, ArrowDownLeft, ArrowUpDown, RefreshCcw,
  Send, Wallet, CreditCard, CheckCircle, AlertCircle, Zap
} from 'lucide-react';
import { accountApi, transactionApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/shared/Sidebar';
import OtpModal from '../components/shared/OtpModal';
import toast from 'react-hot-toast';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0);

const TX_TYPES = [
  { key: 'credit',   label: 'CREDIT',   icon: ArrowDownLeft,  color: 'var(--green)', desc: 'Add funds to account' },
  { key: 'debit',    label: 'DEBIT',    icon: ArrowUpRight,   color: 'var(--red)',   desc: 'Remove funds from account' },
  { key: 'withdraw', label: 'WITHDRAW', icon: ArrowUpDown,    color: 'var(--yellow)',desc: 'Withdraw cash' },
  { key: 'transfer', label: 'TRANSFER', icon: Send,           color: 'var(--cyan)',  desc: 'Send to another account' },
];

export default function TransactionsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [txType, setTxType] = useState(searchParams.get('type') || 'credit');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [toAccountInfo, setToAccountInfo] = useState(null);
  const [showOtp, setShowOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => { loadAccounts(); }, []);

  const loadAccounts = async () => {
    try {
      const { data } = await accountApi.getAll();
      setAccounts(data);
      if (data.length > 0) setSelectedAccount(data[0]);
    } catch { toast.error('Failed to load accounts'); }
  };

  const lookupAccount = async () => {
    if (!toAccount || toAccount.length < 10) return;
    try {
      const { data } = await accountApi.lookup(toAccount);
      setToAccountInfo(data);
    } catch {
      setToAccountInfo(null);
    }
  };

  const handleInitiate = () => {
    if (!amount || parseFloat(amount) <= 0) return toast.error('Enter valid amount');
    if (!selectedAccount) return toast.error('Select an account');
    if (txType === 'transfer' && !toAccount) return toast.error('Enter destination account');
    setShowOtp(false);
    // Request OTP first
    transactionApi.requestOtp()
      .then(() => { setShowOtp(true); toast.success('OTP sent to your email'); })
      .catch(() => toast.error('Failed to send OTP'));
  };

  const handleConfirm = async (otpCode) => {
    setLoading(true);
    try {
      let res;
      const base = { accountId: selectedAccount.id, amount: parseFloat(amount), description, otp: otpCode };
      if (txType === 'credit')    res = await transactionApi.credit(base);
      else if (txType === 'debit') res = await transactionApi.debit(base);
      else if (txType === 'withdraw') res = await transactionApi.withdraw(base);
      else res = await transactionApi.transfer({ fromAccountId: selectedAccount.id, toAccountNumber: toAccount, amount: parseFloat(amount), description, otp: otpCode });

      setResult(res.data);
      setShowOtp(false);
      toast.success('Transaction successful!');
      loadAccounts();
      setAmount(''); setDescription(''); setToAccount(''); setToAccountInfo(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transaction failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const activeType = TX_TYPES.find(t => t.key === txType);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <div>
            <div className="page-title">TRANSACTIONS</div>
            <div className="page-subtitle">SECURE FINANCIAL OPERATIONS | ENCRYPTED</div>
          </div>
        </div>

        <div className="page-body">
          {/* Success result */}
          {result && (
            <div className="alert alert-success animate-fade-up" style={{ marginBottom: 24 }}>
              <CheckCircle size={16} />
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Transaction Successful</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  TXN: {result.transactionId} | Amount: {fmt(result.amount)} | Balance: {fmt(result.balanceAfter)}
                </div>
              </div>
              <button onClick={() => setResult(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>×</button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
            {/* Left: Form */}
            <div>
              {/* Type selector */}
              <div className="section-title">Transaction Type</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 28 }}>
                {TX_TYPES.map(({ key, label, icon: Icon, color, desc }) => (
                  <div key={key}
                    onClick={() => setTxType(key)}
                    style={{
                      padding: '16px 12px', borderRadius: 4, cursor: 'pointer', textAlign: 'center',
                      background: txType === key ? `rgba(${key === 'credit' ? '0,255,136' : key === 'debit' ? '255,51,102' : key === 'withdraw' ? '255,204,0' : '0,212,255'},0.1)` : 'var(--bg-card)',
                      border: `1px solid ${txType === key ? color : 'var(--border)'}`,
                      boxShadow: txType === key ? `0 0 12px ${color}33` : 'none',
                      transition: 'all 0.2s'
                    }}>
                    <Icon size={22} color={color} style={{ marginBottom: 6 }} />
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, color, letterSpacing: 1 }}>{label}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', marginTop: 3 }}>{desc}</div>
                  </div>
                ))}
              </div>

              {/* Account selector */}
              <div className="section-title">From Account</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginBottom: 28 }}>
                {accounts.map(acc => (
                  <div key={acc.id}
                    className={`account-card${selectedAccount?.id === acc.id ? ' selected' : ''}`}
                    onClick={() => setSelectedAccount(acc)}
                    style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase' }}>{acc.accountType}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--cyan)', marginTop: 2 }}>{acc.accountNumber}</div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(acc.balance)}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Transfer destination */}
              {txType === 'transfer' && (
                <div className="card" style={{ marginBottom: 24 }}>
                  <div className="section-title">Destination Account</div>
                  <div className="input-group">
                    <label className="input-label">Beneficiary Account Number</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <input className="input-field" placeholder="CYBR000000000000"
                        value={toAccount} onChange={e => setToAccount(e.target.value)}
                        onBlur={lookupAccount} style={{ flex: 1 }} />
                      <button className="btn btn-ghost" onClick={lookupAccount}>VERIFY</button>
                    </div>
                  </div>
                  {toAccountInfo && (
                    <div className="alert alert-success" style={{ marginTop: 0 }}>
                      <CheckCircle size={14} />
                      <span>Account holder: <strong>{toAccountInfo.holderName}</strong> | IFSC: {toAccountInfo.ifscCode}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Amount & description */}
              <div className="card">
                <div className="section-title">Transaction Details</div>
                <div className="input-group">
                  <label className="input-label">Amount (₹)</label>
                  <div className="input-with-icon">
                    <Wallet size={15} className="input-icon" />
                    <input className="input-field" type="number" placeholder="0.00"
                      value={amount} onChange={e => setAmount(e.target.value)} min="1" step="0.01" />
                  </div>
                  {selectedAccount && amount && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, marginTop: 4, color: parseFloat(amount) > selectedAccount.balance && txType !== 'credit' ? 'var(--red)' : 'var(--text-dim)' }}>
                      Available: {fmt(selectedAccount.balance)}
                      {parseFloat(amount) > selectedAccount.balance && txType !== 'credit' && ' — INSUFFICIENT BALANCE'}
                    </div>
                  )}
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Remark / Description</label>
                  <input className="input-field" placeholder="Payment reference..."
                    value={description} onChange={e => setDescription(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Right: Summary */}
            <div>
              <div className="card card-glow" style={{ position: 'sticky', top: 20 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--cyan)', letterSpacing: 2, marginBottom: 20 }}>
                  TRANSACTION SUMMARY
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
                  {[
                    ['Type', activeType?.label, activeType?.color],
                    ['From', selectedAccount?.accountNumber || '—', 'var(--text-primary)'],
                    ['Amount', amount ? fmt(parseFloat(amount)) : '₹ —', amount ? activeType?.color : 'var(--text-dim)'],
                    txType === 'transfer' ? ['To', toAccount || '—', 'var(--cyan)'] : null,
                    ['Description', description || '—', 'var(--text-secondary)'],
                  ].filter(Boolean).map(([label, val, color]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase' }}>{label}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color, fontWeight: 600, maxWidth: 160, textAlign: 'right', wordBreak: 'break-all' }}>{val}</span>
                    </div>
                  ))}
                </div>

                <div style={{ padding: '12px 16px', background: 'rgba(0,212,255,0.05)', border: '1px solid var(--border)', borderRadius: 3, marginBottom: 20, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
                  <Zap size={12} color="var(--cyan)" style={{ display: 'inline', marginRight: 4 }} />
                  OTP verification required for all transactions
                </div>

                <button className="btn btn-primary btn-full" onClick={handleInitiate} disabled={!amount || !selectedAccount || parseFloat(amount) <= 0}>
                  <Zap size={14} />
                  INITIATE TRANSACTION
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showOtp && (
        <OtpModal
          title="AUTHORIZE TRANSACTION"
          email={user?.email}
          onVerify={handleConfirm}
          onCancel={() => setShowOtp(false)}
          onResend={() => transactionApi.requestOtp()}
        />
      )}
    </div>
  );
}
