import { useEffect, useState } from 'react';
import {
  TrendingUp, Calculator, FileText, CheckCircle,
  Clock, XCircle, Zap, ChevronRight, AlertCircle
} from 'lucide-react';
import { accountApi, loanApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/shared/Sidebar';
import OtpModal from '../components/shared/OtpModal';
import toast from 'react-hot-toast';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—';

const LOAN_TYPES = [
  { value: 'PERSONAL',  label: 'Personal Loan',  rate: '12.0%', max: '₹10L',  icon: '👤' },
  { value: 'HOME',      label: 'Home Loan',       rate: '8.5%',  max: '₹1Cr',  icon: '🏠' },
  { value: 'EDUCATION', label: 'Education Loan',  rate: '9.0%',  max: '₹20L',  icon: '🎓' },
  { value: 'VEHICLE',   label: 'Vehicle Loan',    rate: '10.5%', max: '₹50L',  icon: '🚗' },
  { value: 'BUSINESS',  label: 'Business Loan',   rate: '14.0%', max: '₹2Cr',  icon: '💼' },
];

const TENURE_OPTIONS = [6,12,18,24,36,48,60,84,120,180,240,360];

const STATUS_MAP = {
  APPLIED:      { color: 'var(--yellow)', bg: 'rgba(255,204,0,0.1)',   border: 'rgba(255,204,0,0.3)',   icon: Clock,         label: 'APPLIED' },
  UNDER_REVIEW: { color: 'var(--cyan)',   bg: 'rgba(0,212,255,0.1)',   border: 'rgba(0,212,255,0.3)',   icon: AlertCircle,   label: 'UNDER REVIEW' },
  APPROVED:     { color: 'var(--green)',  bg: 'rgba(0,255,136,0.1)',   border: 'rgba(0,255,136,0.3)',   icon: CheckCircle,   label: 'APPROVED' },
  DISBURSED:    { color: 'var(--cyan)',   bg: 'rgba(0,212,255,0.08)',  border: 'rgba(0,212,255,0.25)',  icon: CheckCircle,   label: 'DISBURSED' },
  CLOSED:       { color: 'var(--text-dim)', bg: 'rgba(0,0,0,0.2)',    border: 'var(--border)',          icon: CheckCircle,   label: 'CLOSED' },
  REJECTED:     { color: 'var(--red)',    bg: 'rgba(255,51,102,0.1)',  border: 'rgba(255,51,102,0.3)',  icon: XCircle,       label: 'REJECTED' },
};

export default function LoansPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('apply');
  const [accounts, setAccounts] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);

  const [form, setForm] = useState({
    accountId: '', loanType: 'PERSONAL', principalAmount: '', tenureMonths: '24',
    aadhaarNumber: '', panNumber: '',
  });
  const [emi, setEmi] = useState(null);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (form.principalAmount && form.tenureMonths) calcEmi();
  }, [form.principalAmount, form.tenureMonths, form.loanType]);

  const loadData = async () => {
    try {
      const [accRes, loanRes] = await Promise.all([accountApi.getAll(), loanApi.getMy()]);
      setAccounts(accRes.data);
      setLoans(loanRes.data);
      if (accRes.data.length > 0) setForm(f => ({ ...f, accountId: accRes.data[0].id }));
    } catch { toast.error('Failed to load data'); }
  };

  const calcEmi = async () => {
    if (!form.principalAmount || parseFloat(form.principalAmount) < 10000) return;
    try {
      const { data } = await loanApi.calculateEmi({
        principal: parseFloat(form.principalAmount),
        loanType: form.loanType,
        tenure: parseInt(form.tenureMonths),
      });
      setEmi(data);
    } catch {}
  };

  const handleInitiate = () => {
    if (!form.accountId) return toast.error('Select an account');
    if (!form.principalAmount || parseFloat(form.principalAmount) < 10000) return toast.error('Minimum loan amount is ₹10,000');
    if (!form.aadhaarNumber || form.aadhaarNumber.length !== 12) return toast.error('Enter valid 12-digit Aadhaar number');
    if (!form.panNumber || form.panNumber.length !== 10) return toast.error('Enter valid 10-character PAN number');
    loanApi.requestOtp()
      .then(() => { setShowOtp(true); toast.success('OTP sent for loan verification'); })
      .catch(() => toast.error('Failed to send OTP'));
  };

  const handleApply = async (otpCode) => {
    setLoading(true);
    try {
      await loanApi.apply({ ...form, principalAmount: parseFloat(form.principalAmount), tenureMonths: parseInt(form.tenureMonths), otp: otpCode });
      toast.success('Loan application submitted!');
      setShowOtp(false);
      setTab('history');
      loadData();
      setForm(f => ({ ...f, principalAmount: '', aadhaarNumber: '', panNumber: '' }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Application failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const selectedLoanType = LOAN_TYPES.find(l => l.value === form.loanType);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <div>
            <div className="page-title">LOAN CENTER</div>
            <div className="page-subtitle">KYC-VERIFIED LOAN APPLICATIONS | AADHAAR + PAN REQUIRED</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['apply', 'history'].map(t => (
              <button key={t} className={`btn ${tab === t ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(t)}>
                {t === 'apply' ? <FileText size={14} /> : <TrendingUp size={14} />}
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="page-body">
          {tab === 'apply' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
              {/* Form */}
              <div>
                {/* Loan type */}
                <div className="section-title">Select Loan Type</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 28 }}>
                  {LOAN_TYPES.map(lt => (
                    <div key={lt.value}
                      onClick={() => setForm(f => ({ ...f, loanType: lt.value }))}
                      style={{
                        padding: '14px 10px', textAlign: 'center', cursor: 'pointer', borderRadius: 4,
                        background: form.loanType === lt.value ? 'rgba(0,212,255,0.08)' : 'var(--bg-card)',
                        border: `1px solid ${form.loanType === lt.value ? 'var(--cyan)' : 'var(--border)'}`,
                        boxShadow: form.loanType === lt.value ? 'var(--glow-cyan)' : 'none',
                        transition: 'all 0.2s',
                      }}>
                      <div style={{ fontSize: 22, marginBottom: 6 }}>{lt.icon}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: form.loanType === lt.value ? 'var(--cyan)' : 'var(--text-dim)', letterSpacing: 0.5 }}>{lt.label.split(' ')[0]}</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--green)', marginTop: 3 }}>{lt.rate}</div>
                    </div>
                  ))}
                </div>

                {/* Account */}
                <div className="card" style={{ marginBottom: 20 }}>
                  <div className="section-title">Loan Account</div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Disbursement Account</label>
                    <select className="select-field" value={form.accountId} onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.accountNumber} ({a.accountType}) — {fmt(a.balance)}</option>)}
                    </select>
                  </div>
                </div>

                {/* Amount & tenure */}
                <div className="card" style={{ marginBottom: 20 }}>
                  <div className="section-title">Loan Parameters</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">Loan Amount (₹)</label>
                      <input className="input-field" type="number" placeholder="100000"
                        value={form.principalAmount} onChange={e => setForm(f => ({ ...f, principalAmount: e.target.value }))} min="10000" />
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>Min ₹10,000 | {selectedLoanType?.max}</div>
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">Tenure (Months)</label>
                      <select className="select-field" value={form.tenureMonths} onChange={e => setForm(f => ({ ...f, tenureMonths: e.target.value }))}>
                        {TENURE_OPTIONS.map(t => <option key={t} value={t}>{t} months ({(t/12).toFixed(1)} yrs)</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* KYC */}
                <div className="card">
                  <div className="section-title" style={{ color: 'var(--yellow)' }}>KYC Verification (Required)</div>
                  <div className="alert alert-info" style={{ marginBottom: 16 }}>
                    <AlertCircle size={14} />
                    Aadhaar and PAN are mandatory for loan applications as per RBI guidelines.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">Aadhaar Number</label>
                      <input className="input-field" placeholder="XXXX XXXX XXXX"
                        value={form.aadhaarNumber}
                        onChange={e => setForm(f => ({ ...f, aadhaarNumber: e.target.value.replace(/\D/g, '').slice(0, 12) }))}
                        maxLength={12} />
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
                        {form.aadhaarNumber.length}/12 digits
                      </div>
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">PAN Number</label>
                      <input className="input-field" placeholder="ABCDE1234F"
                        value={form.panNumber}
                        onChange={e => setForm(f => ({ ...f, panNumber: e.target.value.toUpperCase().slice(0, 10) }))}
                        maxLength={10} style={{ textTransform: 'uppercase' }} />
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
                        {form.panNumber.length}/10 characters
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div>
                <div className="card card-glow" style={{ position: 'sticky', top: 20 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: 'var(--cyan)', letterSpacing: 2, marginBottom: 20 }}>
                    LOAN SUMMARY
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                    {[
                      ['Loan Type', selectedLoanType?.label],
                      ['Interest Rate', selectedLoanType?.rate],
                      ['Amount', form.principalAmount ? fmt(parseFloat(form.principalAmount)) : '—'],
                      ['Tenure', `${form.tenureMonths} months`],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>{k}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)' }}>{v}</span>
                      </div>
                    ))}
                  </div>

                  {emi && (
                    <div style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 3, padding: '16px', marginBottom: 20 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', marginBottom: 12 }}>EMI BREAKDOWN</div>
                      {[
                        ['Monthly EMI', fmt(emi.emi), 'var(--cyan)'],
                        ['Total Payable', fmt(emi.totalPayable), 'var(--yellow)'],
                        ['Total Interest', fmt(emi.totalInterest), 'var(--red)'],
                      ].map(([k, v, c]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>{k}</span>
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: c }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <button className="btn btn-primary btn-full" onClick={handleInitiate}>
                    <Zap size={14} />APPLY FOR LOAN
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* History */
            <div>
              <div className="section-title">My Loans</div>
              {loans.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                  <TrendingUp size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                  <div>No loan applications yet.</div>
                  <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setTab('apply')}>
                    APPLY FOR LOAN
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {loans.map(loan => {
                    const s = STATUS_MAP[loan.status] || STATUS_MAP.APPLIED;
                    const Icon = s.icon;
                    return (
                      <div key={loan.id} className="card" style={{ border: `1px solid ${s.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)', fontWeight: 600 }}>{loan.loanId}</span>
                              <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, padding: '2px 10px', borderRadius: 2, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Icon size={10} />{s.label}
                              </span>
                            </div>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 4 }}>
                              {fmt(loan.principalAmount)}
                            </div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
                              {loan.loanType} LOAN | {loan.tenureMonths} months | {loan.interestRate}% p.a.
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Monthly EMI</div>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--cyan)' }}>{fmt(loan.emiAmount)}</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', marginTop: 8 }}>Applied: {fmtDate(loan.appliedAt)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showOtp && (
        <OtpModal
          title="LOAN APPLICATION AUTH"
          email={user?.email}
          onVerify={handleApply}
          onCancel={() => setShowOtp(false)}
          onResend={() => loanApi.requestOtp()}
        />
      )}
    </div>
  );
}
