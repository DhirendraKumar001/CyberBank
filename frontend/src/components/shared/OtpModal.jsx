import { useState, useRef, useEffect } from 'react';
import { Shield, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OtpModal({ onVerify, onCancel, onResend, title = 'AUTHORIZE TRANSACTION', email = '' }) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(300);
  const otpRefs = useRef([]);

  useEffect(() => {
    otpRefs.current[0]?.focus();
    const iv = setInterval(() => setTimer(t => { if (t <= 1) { clearInterval(iv); return 0; } return t - 1; }), 1000);
    return () => clearInterval(iv);
  }, []);

  const handleChange = (idx, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp]; next[idx] = val.slice(-1); setOtp(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleKey = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) { setOtp(text.split('')); otpRefs.current[5]?.focus(); }
  };

  const handleSubmit = async () => {
    const code = otp.join('');
    if (code.length !== 6) return toast.error('Enter 6-digit OTP');
    setLoading(true);
    try {
      await onVerify(code);
    } catch {
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-title">
          <Shield size={18} />
          {title}
          <button onClick={onCancel} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 8, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)' }}>
          OTP sent to <span style={{ color: 'var(--cyan)' }}>{email}</span>
        </div>

        <div className="otp-container" onPaste={handlePaste}>
          {otp.map((d, i) => (
            <input key={i} ref={el => otpRefs.current[i] = el}
              className="otp-digit" maxLength={1} value={d}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKey(i, e)}
              inputMode="numeric"
            />
          ))}
        </div>

        <div style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)', marginBottom: 20 }}>
          Expires: <span style={{ color: timer < 60 ? 'var(--red)' : 'var(--cyan)' }}>{fmtTime(timer)}</span>
        </div>

        <button className="btn btn-primary btn-full" onClick={handleSubmit}
          disabled={loading || otp.join('').length !== 6}>
          {loading ? <><span className="spinner" />VERIFYING...</> : <><Shield size={14} />CONFIRM</>}
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
          <button className="btn btn-ghost" style={{ flex: 1, marginRight: 8 }} onClick={onCancel}>CANCEL</button>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onResend} disabled={timer > 240}>
            RESEND {timer > 240 ? `(${fmtTime(timer - 240)})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
