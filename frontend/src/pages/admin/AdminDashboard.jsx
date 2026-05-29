import { useEffect, useState } from 'react';
import {
  Users, CreditCard, Activity, TrendingUp,
  CheckSquare, Wallet, RefreshCcw, Shield, Zap, Terminal
} from 'lucide-react';
import { adminApi } from '../../services/api';
import Sidebar from '../../components/shared/Sidebar';
import toast from 'react-hot-toast';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className={`stat-card ${color}`}>
      <div className={`stat-icon ${color}`}><Icon size={20} /></div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.dashboard();
      setStats(data);
    } catch { toast.error('Failed to load admin stats'); }
    finally { setLoading(false); }
  };

  const now = new Date();

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <div>
            <div className="page-title">ADMIN CONSOLE</div>
            <div className="page-subtitle">
              SYSTEM STATUS: <span style={{ color: 'var(--green)' }}>ALL SYSTEMS OPERATIONAL</span> &nbsp;|&nbsp;
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                {now.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' })}
              </span>
            </div>
          </div>
          <button className="btn btn-ghost" onClick={load}><RefreshCcw size={14} />REFRESH</button>
        </div>

        <div className="page-body">
          {/* Security banner */}
          <div style={{ padding: '12px 20px', marginBottom: 24, background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Shield size={16} color="var(--cyan)" />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)' }}>
              <span style={{ color: 'var(--cyan)' }}>ADMIN ACCESS GRANTED</span> — All actions are logged and audited. Unauthorized access is prohibited.
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)', animation: 'pulse-glow 1.5s infinite' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--green)' }}>SECURE SESSION</span>
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
              <div className="spinner" style={{ width: 48, height: 48 }} />
            </div>
          ) : stats && (
            <>
              <div className="stat-grid">
                <StatCard label="Total Users"         value={stats.totalUsers}         icon={Users}       color="cyan"   />
                <StatCard label="Bank Accounts"       value={stats.totalAccounts}      icon={CreditCard}  color="green"  />
                <StatCard label="Total Transactions"  value={stats.totalTransactions}  icon={Activity}    color="yellow" />
                <StatCard label="Pending Loans"       value={stats.pendingLoans}       icon={TrendingUp}  color="red"    />
                <StatCard label="Pending KYC"         value={stats.pendingKyc}         icon={CheckSquare} color="cyan"   />
                <StatCard label="Total Deposits"      value={fmt(stats.totalBalance)}  icon={Wallet}      color="green"  sub="Across all accounts" />
              </div>

              {/* Live terminal feed */}
              <div className="section-title">System Monitor</div>
              <div style={{ background: '#020810', border: '1px solid var(--border)', borderRadius: 4, padding: '20px 24px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
                  <Terminal size={14} color="var(--cyan)" />
                  <span style={{ color: 'var(--cyan)', letterSpacing: 2, fontSize: 11 }}>CYBERBANK SYSTEM LOG</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    {['#ff5f57','#febc2e','#28c840'].map(c => (
                      <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                    ))}
                  </div>
                </div>
                {[
                  { ts: '00:01', msg: 'System boot sequence complete. All modules operational.', color: 'var(--green)' },
                  { ts: '00:02', msg: `Database connection established. ${stats.totalAccounts} accounts indexed.`, color: 'var(--cyan)' },
                  { ts: '00:03', msg: `Security module loaded. 2FA enforcement: ACTIVE.`, color: 'var(--cyan)' },
                  { ts: '00:04', msg: `${stats.pendingLoans} loan applications awaiting review.`, color: stats.pendingLoans > 0 ? 'var(--yellow)' : 'var(--text-dim)' },
                  { ts: '00:05', msg: `${stats.pendingKyc} KYC documents pending verification.`, color: stats.pendingKyc > 0 ? 'var(--yellow)' : 'var(--text-dim)' },
                  { ts: '00:06', msg: `Total assets under management: ${fmt(stats.totalBalance)}`, color: 'var(--green)' },
                  { ts: '00:07', msg: 'Encryption: AES-256 | JWT Auth: RS256 | TLS: 1.3', color: 'var(--text-dim)' },
                  { ts: '00:08', msg: `Admin session authenticated. Monitoring ${stats.totalUsers} user accounts.`, color: 'var(--cyan)' },
                ].map(({ ts, msg, color }, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 6, color }}>
                    <span style={{ color: 'var(--text-dim)', flexShrink: 0 }}>[{ts}]</span>
                    <span>{msg}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 12, color: 'var(--green)', marginTop: 8 }}>
                  <span style={{ color: 'var(--text-dim)' }}>[{String(now.getHours()).padStart(2,'0')}:{String(now.getMinutes()).padStart(2,'0')}:{String(now.getSeconds()).padStart(2,'0')}]</span>
                  <span>Awaiting commands<span style={{ animation: 'blink 1s infinite' }}>_</span></span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
