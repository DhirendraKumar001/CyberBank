import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, User, Mail, Lock, Phone, Eye, EyeOff, Zap, Terminal } from 'lucide-react';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [username, setUsername] = useState('');
  const [form, setForm] = useState({ username: '', email: '', password: '', fullName: '', phone: '' });
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(0);
  const otpRefs = useRef([]);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const validate = () => {
    if (!form.username || !form.email || !form.password || !form.fullName || !form.phone)
      return toast.error('All fields required') || false;
    if (form.password.length < 8)
      return toast.error('Password must be 8+ characters') || false;
    if (!/^[6-9]\d{9}$/.test(form.phone))
      return toast.error('Enter valid Indian mobile number') || false;
    return true;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await authApi.register(form);
      setUsername(form.username);
      setStep('otp');
      startTimer();
      toast.success('Account created! OTP sent to your email.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const startTimer = () => {
    setTimer(300);
    const iv = setInterval(() => setTimer(t => { if (t <= 1) { clearInterval(iv); return 0; } return t - 1; }), 1000);
  };

  const handleOtpChange = (idx, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp]; next[idx] = val.slice(-1); setOtp(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKey = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) return toast.error('Enter 6-digit OTP');
    setLoading(true);
    try {
      const { data } = await authApi.verifyOtp({ username, otp: code, otpType: 'LOGIN' });
      toast.success('Identity verified! Please login.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="auth-page">
      <div className="scanline-overlay" />
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '15%', right: '15%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,255,136,0.05) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '15%', left: '15%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,255,0.05) 0%, transparent 70%)' }} />
      </div>

      <div className="auth-card" style={{ maxWidth: 460 }}>
        <div className="auth-logo">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
            <Shield size={32} color="var(--green)" style={{ filter: 'drop-shadow(0 0 8px var(--green))' }} />
            <h1 style={{ color: 'var(--green)', textShadow: 'var(--glow-green)' }}>CYBERBANK</h1>
          </div>
          <p>CREATE NEW SECURE ACCOUNT</p>
        </div>

        {step === 'form' ? (
          <form onSubmit={handleRegister}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', marginBottom: 20, padding: '8px 12px', background: 'rgba(0,255,136,0.03)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 3 }}>
              <span style={{ color: 'var(--green)' }}>SYS</span> New account registration protocol initiated.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Full Name</label>
                <div className="input-with-icon">
                  <User size={15} className="input-icon" />
                  <input name="fullName" className="input-field" placeholder="John Doe" value={form.fullName} onChange={handleChange} />
                </div>
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Username</label>
                <div className="input-with-icon">
                  <Terminal size={15} className="input-icon" />
                  <input name="username" className="input-field" placeholder="johndoe" value={form.username} onChange={handleChange} />
                </div>
              </div>
            </div>

            <div className="input-group" style={{ marginTop: 12 }}>
              <label className="input-label">Email Address</label>
              <div className="input-with-icon">
                <Mail size={15} className="input-icon" />
                <input name="email" type="email" className="input-field" placeholder="john@example.com" value={form.email} onChange={handleChange} />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Mobile Number</label>
              <div className="input-with-icon">
                <Phone size={15} className="input-icon" />
                <input name="phone" className="input-field" placeholder="9876543210" value={form.phone} onChange={handleChange} maxLength={10} />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <div className="input-with-icon" style={{ position: 'relative' }}>
                <Lock size={15} className="input-icon" />
                <input name="password" type={showPass ? 'text' : 'password'} className="input-field" placeholder="Min 8 characters" value={form.password} onChange={handleChange} style={{ paddingRight: 40 }} />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {form.password && (
                <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: form.password.length >= i * 2 ? (i <= 2 ? 'var(--red)' : i === 3 ? 'var(--yellow)' : 'var(--green)') : 'var(--border)' }} />
                  ))}
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-success btn-full" disabled={loading}>
              {loading ? <><span className="spinner" />CREATING ACCOUNT...</> : <><Zap size={14} />CREATE SECURE ACCOUNT</>}
            </button>

            <div style={{ textAlign: 'center', marginTop: 16, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)' }}>
              Have access?{' '}
              <Link to="/login" style={{ color: 'var(--cyan)', textDecoration: 'none' }}>LOGIN HERE</Link>
            </div>
          </form>
        ) : (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Shield size={40} color="var(--green)" style={{ filter: 'drop-shadow(0 0 12px var(--green))', marginBottom: 12 }} />
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text-primary)', letterSpacing: 2, marginBottom: 6 }}>
                IDENTITY VERIFICATION
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)' }}>
                OTP sent to <span style={{ color: 'var(--green)' }}>{form.email}</span>
              </div>
            </div>

            <div className="otp-container">
              {otp.map((d, i) => (
                <input key={i} ref={el => otpRefs.current[i] = el} className="otp-digit"
                  style={{ borderColor: d ? 'var(--green)' : undefined, color: 'var(--green)' }}
                  maxLength={1} value={d}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKey(i, e)}
                  inputMode="numeric" autoFocus={i === 0}
                />
              ))}
            </div>

            {timer > 0 && (
              <div style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>
                Expires in <span style={{ color: timer < 60 ? 'var(--red)' : 'var(--green)' }}>{fmtTime(timer)}</span>
              </div>
            )}

            <button className="btn btn-success btn-full" onClick={handleVerify} disabled={loading || otp.join('').length !== 6}>
              {loading ? <><span className="spinner" />VERIFYING...</> : <><Shield size={14} />VERIFY IDENTITY</>}
            </button>
            <button className="btn btn-ghost" style={{ width: '100%', marginTop: 10 }} onClick={() => setStep('form')}>
              ← BACK TO FORM
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
