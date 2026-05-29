import { useEffect, useState } from 'react';
import { CheckSquare, CheckCircle, XCircle, RefreshCcw, Shield, Eye } from 'lucide-react';
import { adminApi } from '../../services/api';
import Sidebar from '../../components/shared/Sidebar';
import toast from 'react-hot-toast';

const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export default function AdminKycPage() {
  const [kycList, setKycList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => { loadKyc(); }, []);

  const loadKyc = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getPendingKyc();
      setKycList(data);
    } catch { toast.error('Failed to load KYC records'); }
    finally { setLoading(false); }
  };

  const handleVerify = async (id) => {
    setActionLoading(id + '_v');
    try {
      await adminApi.verifyKyc(id);
      toast.success('KYC verified successfully');
      setSelected(null);
      loadKyc();
    } catch { toast.error('Failed to verify KYC'); }
    finally { setActionLoading(null); }
  };

  const handleReject = async (id) => {
    setActionLoading(id + '_r');
    try {
      await adminApi.rejectKyc(id);
      toast.success('KYC rejected');
      setSelected(null);
      loadKyc();
    } catch { toast.error('Failed to reject KYC'); }
    finally { setActionLoading(null); }
  };

  const maskAadhaar = (n) => n ? '****-****-' + n.slice(-4) : '—';
  const maskPan = (n) => n ? n.slice(0, 3) + '*****' + n.slice(-2) : '—';

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <div>
            <div className="page-title">KYC VERIFICATION</div>
            <div className="page-subtitle">{kycList.length} DOCUMENTS PENDING REVIEW</div>
          </div>
          <button className="btn btn-ghost" onClick={loadKyc}><RefreshCcw size={14} />REFRESH</button>
        </div>

        <div className="page-body">
          <div className="alert alert-info" style={{ marginBottom: 24 }}>
            <Shield size={14} />
            Review Aadhaar and PAN details carefully before approving. Verified KYC enables loan applications.
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
              <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
          ) : kycList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 80, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
              <CheckSquare size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
              <div>No pending KYC documents.</div>
              <div style={{ marginTop: 8, fontSize: 12 }}>All documents have been reviewed.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
              {kycList.map(kyc => (
                <div key={kyc.id} className="card" style={{ border: '1px solid rgba(255,204,0,0.3)', background: 'rgba(255,204,0,0.02)' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: 'var(--yellow)', letterSpacing: 2 }}>
                      KYC #{kyc.id}
                    </div>
                    <span className="badge badge-warning">
                      <CheckSquare size={10} /> PENDING
                    </span>
                  </div>

                  {/* User info */}
                  <div style={{ marginBottom: 16, padding: '12px 14px', background: 'rgba(0,0,0,0.3)', borderRadius: 3 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', marginBottom: 6 }}>APPLICANT</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
                      {kyc.user?.username || 'Unknown'}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)', marginTop: 2 }}>
                      {kyc.user?.email || '—'}
                    </div>
                  </div>

                  {/* Document details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 3 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>AADHAAR</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)', letterSpacing: 2 }}>
                          {selected === kyc.id ? kyc.aadhaarNumber : maskAadhaar(kyc.aadhaarNumber)}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 3 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>PAN</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)', letterSpacing: 2 }}>
                        {selected === kyc.id ? kyc.panNumber : maskPan(kyc.panNumber)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 3 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>SUBMITTED</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                        {fmtDate(kyc.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-ghost"
                      style={{ flex: 1, fontSize: 11 }}
                      onClick={() => setSelected(selected === kyc.id ? null : kyc.id)}
                    >
                      <Eye size={12} />{selected === kyc.id ? 'HIDE' : 'REVEAL'}
                    </button>
                    <button
                      className="btn btn-success"
                      style={{ flex: 1, fontSize: 11 }}
                      onClick={() => handleVerify(kyc.id)}
                      disabled={actionLoading === kyc.id + '_v'}
                    >
                      {actionLoading === kyc.id + '_v'
                        ? <span className="spinner" style={{ width: 12, height: 12 }} />
                        : <><CheckCircle size={12} />APPROVE</>}
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{ flex: 1, fontSize: 11 }}
                      onClick={() => handleReject(kyc.id)}
                      disabled={actionLoading === kyc.id + '_r'}
                    >
                      {actionLoading === kyc.id + '_r'
                        ? <span className="spinner" style={{ width: 12, height: 12 }} />
                        : <><XCircle size={12} />REJECT</>}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
