import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield, Terminal, Eye, EyeOff, Lock, User,
  Zap, KeyRound, RotateCcw, CheckCircle, Mail
} from 'lucide-react';
import { authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

// ── Shared helpers ────────────────────────────────────────────────────────────
const fmtTime = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

function OtpInputRow({ otp, setOtp, refs }) {
  const handleChange = (idx, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp]; next[idx] = val.slice(-1); setOtp(next);
    if (val && idx < 5) refs.current[idx + 1]?.focus();
  };
  const handleKey = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) refs.current[idx - 1]?.focus();
  };
  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) { setOtp(text.split('')); refs.current[5]?.focus(); }
  };
  return (
    <div className="otp-container" onPaste={handlePaste}>
      {otp.map((d, i) => (
        <input
          key={i}
          ref={el => refs.current[i] = el}
          className="otp-digit"
          maxLength={1}
          value={d}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          inputMode="numeric"
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  // 'credentials' | 'otp' | 'forgot_request' | 'forgot_otp' | 'forgot_reset'
  const [step, setStep] = useState('credentials');

  // Login state
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [timer, setTimer] = useState(0);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const loginOtpRefs = useRef([]);

  // Forgot password state
  const [fpIdentifier, setFpIdentifier] = useState('');   // username or email entered
  const [fpUsername, setFpUsername] = useState('');        // resolved username from server
  const [fpMaskedEmail, setFpMaskedEmail] = useState('');
  const [fpOtp, setFpOtp] = useState(['', '', '', '', '', '']);
  const [fpResetToken, setFpResetToken] = useState('');
  const [fpNewPassword, setFpNewPassword] = useState('');
  const [fpConfirmPassword, setFpConfirmPassword] = useState('');
  const [fpTimer, setFpTimer] = useState(0);
  const fpOtpRefs = useRef([]);

  // ── Timer ──────────────────────────────────────────────────────────────────
  const startTimer = (setter) => {
    setter(300);
    const iv = setInterval(() =>
      setter(t => { if (t <= 1) { clearInterval(iv); return 0; } return t - 1; }), 1000);
    return iv;
  };

  // ── LOGIN flow ─────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) return toast.error('Enter credentials');
    setLoading(true);
    try {
      const { data } = await authApi.login({ username, password });
      console.log('[LOGIN] response:', data);   // debug — remove later

      if (data.twoFactorRequired) {
        setMaskedEmail(data.message || 'your email');
        setOtp(['', '', '', '', '', '']);
        setStep('otp');
        startTimer(setTimer);
        toast.success('OTP dispatched — check your email');
      } else {
        // Direct login (2FA disabled) — normalize the user object
        const userData = data.user || {
          username: data.username,
          email:    data.email,
          fullName: data.fullName,
          role:     data.role,
        };
        console.log('[LOGIN] saving user:', userData);
        login(data.token, userData);
        navigate(userData?.role === 'ADMIN' ? '/admin' : '/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Authentication failed');
    } finally { setLoading(false); }
  };

  const handleVerifyLoginOtp = async () => {
    const code = otp.join('');
    if (code.length !== 6) return toast.error('Enter 6-digit OTP');
    setLoading(true);
    try {
      const { data } = await authApi.verifyOtp({ username, otp: code, otpType: 'LOGIN' });
      console.log('[OTP VERIFY] response:', data);   // debug — remove later

      // Normalize user object — backend returns data.user nested map
      const userData = data.user || {};
      console.log('[OTP VERIFY] saving user:', userData);

      login(data.token, userData);
      toast.success('Access granted!');
      navigate(userData?.role === 'ADMIN' ? '/admin' : '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      loginOtpRefs.current[0]?.focus();
    } finally { setLoading(false); }
  };

  const handleResendLoginOtp = async () => {
    try {
      await authApi.resendOtp({ username, otpType: 'LOGIN' });
      toast.success('New OTP dispatched');
      setOtp(['', '', '', '', '', '']);
      startTimer(setTimer);
    } catch { toast.error('Failed to resend OTP'); }
  };

  // ── FORGOT PASSWORD flow ──────────────────────────────────────────────────
  const handleForgotRequest = async (e) => {
    e.preventDefault();
    if (!fpIdentifier.trim()) return toast.error('Enter your username or email');
    setLoading(true);
    try {
      const { data } = await authApi.forgotPassword({ identifier: fpIdentifier.trim() });
      setFpUsername(data.username);
      setFpMaskedEmail(data.maskedEmail || data.message);
      setFpOtp(['', '', '', '', '', '']);
      setStep('forgot_otp');
      startTimer(setFpTimer);
      toast.success('Reset OTP sent — check your email');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Account not found');
    } finally { setLoading(false); }
  };

  const handleVerifyForgotOtp = async () => {
    const code = fpOtp.join('');
    if (code.length !== 6) return toast.error('Enter 6-digit OTP');
    setLoading(true);
    try {
      const { data } = await authApi.verifyResetOtp({ username: fpUsername, otp: code });
      setFpResetToken(data.resetToken);
      setFpNewPassword('');
      setFpConfirmPassword('');
      setStep('forgot_reset');
      toast.success('OTP verified — set your new password');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
      setFpOtp(['', '', '', '', '', '']);
      fpOtpRefs.current[0]?.focus();
    } finally { setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (fpNewPassword.length < 8) return toast.error('Password must be at least 8 characters');
    if (fpNewPassword !== fpConfirmPassword) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      await authApi.resetPassword({
        username: fpUsername,
        newPassword: fpNewPassword,
        resetToken: fpResetToken,
      });
      toast.success('Password reset! Please login with your new password.');
      // Reset everything back to login
      setStep('credentials');
      setFpIdentifier(''); setFpUsername(''); setFpResetToken('');
      setFpNewPassword(''); setFpConfirmPassword('');
      setUsername(fpUsername);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed. Try again.');
    } finally { setLoading(false); }
  };

  const handleResendForgotOtp = async () => {
    try {
      await authApi.forgotPassword({ identifier: fpUsername });
      toast.success('New OTP dispatched');
      setFpOtp(['', '', '', '', '', '']);
      startTimer(setFpTimer);
    } catch { toast.error('Failed to resend OTP'); }
  };

  const backToLogin = () => {
    setStep('credentials');
    setFpIdentifier(''); setFpUsername(''); setFpOtp(['','','','','','']);
    setFpNewPassword(''); setFpConfirmPassword(''); setFpResetToken('');
  };

  // ── Password strength meter ────────────────────────────────────────────────
  const strength = (pw) => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };
  const strengthColor = (s) => ['var(--border)', 'var(--red)', 'var(--yellow)', 'var(--cyan)', 'var(--green)'][s];
  const strengthLabel = (s) => ['', 'WEAK', 'FAIR', 'GOOD', 'STRONG'][s];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="auth-page">
      <div className="scanline-overlay" />

      {/* Background orbs */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '20%', left: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)', animation: 'pulse-glow 4s infinite' }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(155,89,182,0.05) 0%, transparent 70%)' }} />
        {(step.startsWith('forgot')) && (
          <div style={{ position: 'absolute', top: '40%', right: '20%', width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,204,0,0.05) 0%, transparent 70%)' }} />
        )}
      </div>

      <div className="auth-card" style={{ maxWidth: 420 }}>

        {/* ── Logo ─────────────────────────────────────────────────────────── */}
        <div className="auth-logo">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
            <Shield size={32}
              color={step.startsWith('forgot') ? 'var(--yellow)' : 'var(--cyan)'}
              style={{ filter: `drop-shadow(0 0 8px ${step.startsWith('forgot') ? 'var(--yellow)' : 'var(--cyan)'})` }}
            />
            <h1 style={{ color: step.startsWith('forgot') ? 'var(--yellow)' : 'var(--cyan)', textShadow: step.startsWith('forgot') ? '0 0 20px rgba(255,204,0,0.4)' : undefined }}>
              CYBERBANK
            </h1>
          </div>
          <p>SECURE FINANCIAL NETWORK v2.1</p>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            STEP 1 — Credentials
        ══════════════════════════════════════════════════════════════════ */}
        {step === 'credentials' && (
          <form onSubmit={handleLogin}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', marginBottom: 24, padding: '8px 12px', background: 'rgba(0,212,255,0.03)', border: '1px solid var(--border)', borderRadius: 3 }}>
              <span style={{ color: 'var(--cyan)' }}>SYS</span> Authentication required. Enter credentials to proceed.
            </div>

            <div className="input-group">
              <label className="input-label">
                <Terminal size={12} style={{ display: 'inline', marginRight: 5 }} />Username / ID
              </label>
              <div className="input-with-icon">
                <User size={16} className="input-icon" />
                <input className="input-field" placeholder="enter_username"
                  value={username} onChange={e => setUsername(e.target.value)} autoFocus />
              </div>
            </div>

            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="input-label" style={{ marginBottom: 0 }}>
                  <Lock size={12} style={{ display: 'inline', marginRight: 5 }} />Password
                </label>
                {/* ── Forgot password trigger ── */}
                <button type="button"
                  onClick={() => { setStep('forgot_request'); setFpIdentifier(username); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--yellow)', letterSpacing: 0.5, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <KeyRound size={11} /> FORGOT?
                </button>
              </div>
              <div className="input-with-icon" style={{ position: 'relative' }}>
                <Lock size={16} className="input-icon" />
                <input className="input-field" type={showPass ? 'text' : 'password'}
                  placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)} style={{ paddingRight: 40 }} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? <><span className="spinner" />AUTHENTICATING...</> : <><Zap size={14} />INITIATE LOGIN</>}
            </button>

            <div style={{ textAlign: 'center', marginTop: 20, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)' }}>
              No account?{' '}
              <Link to="/register" style={{ color: 'var(--cyan)', textDecoration: 'none' }}>CREATE ACCESS</Link>
            </div>
          </form>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 2 — Login OTP (2FA)
        ══════════════════════════════════════════════════════════════════ */}
        {step === 'otp' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Shield size={40} color="var(--cyan)" style={{ filter: 'drop-shadow(0 0 12px var(--cyan))', marginBottom: 12 }} />
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text-primary)', letterSpacing: 2, marginBottom: 6 }}>
                2FA VERIFICATION
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)' }}>
                OTP transmitted to <span style={{ color: 'var(--cyan)' }}>{maskedEmail}</span>
              </div>
            </div>

            <OtpInputRow otp={otp} setOtp={setOtp} refs={loginOtpRefs} />

            {timer > 0 && (
              <div style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>
                Expires in <span style={{ color: timer < 60 ? 'var(--red)' : 'var(--cyan)' }}>{fmtTime(timer)}</span>
              </div>
            )}

            <button className="btn btn-primary btn-full" onClick={handleVerifyLoginOtp}
              disabled={loading || otp.join('').length !== 6}>
              {loading ? <><span className="spinner" />VERIFYING...</> : <><Shield size={14} />VERIFY & ACCESS</>}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
              <button className="btn btn-ghost" onClick={() => setStep('credentials')} style={{ fontSize: 11 }}>
                ← BACK
              </button>
              <button className="btn btn-ghost" onClick={handleResendLoginOtp} disabled={timer > 0} style={{ fontSize: 11 }}>
                {timer > 0 ? `RESEND (${fmtTime(timer)})` : 'RESEND OTP'}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            FORGOT — Step 1: Enter username or email
        ══════════════════════════════════════════════════════════════════ */}
        {step === 'forgot_request' && (
          <form onSubmit={handleForgotRequest}>
            {/* Yellow accent bar */}
            <div style={{ height: 2, background: 'linear-gradient(90deg,var(--yellow),transparent)', marginBottom: 20, borderRadius: 1 }} />

            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', marginBottom: 24, padding: '10px 14px', background: 'rgba(255,204,0,0.04)', border: '1px solid rgba(255,204,0,0.2)', borderRadius: 3 }}>
              <span style={{ color: 'var(--yellow)' }}>RESET</span> Enter your username or registered email address. We'll send a one-time reset code.
            </div>

            <div className="input-group">
              <label className="input-label" style={{ color: 'var(--yellow)' }}>
                <Mail size={12} style={{ display: 'inline', marginRight: 5 }} />Username or Email
              </label>
              <div className="input-with-icon">
                <User size={16} className="input-icon" />
                <input className="input-field"
                  style={{ borderColor: fpIdentifier ? 'rgba(255,204,0,0.4)' : undefined }}
                  placeholder="username or email@domain.com"
                  value={fpIdentifier}
                  onChange={e => setFpIdentifier(e.target.value)}
                  autoFocus />
              </div>
            </div>

            <button type="submit" className="btn btn-full" disabled={loading || !fpIdentifier.trim()}
              style={{ background: 'linear-gradient(135deg,#332200,#443300)', color: 'var(--yellow)', border: '1px solid var(--yellow)', boxShadow: '0 0 10px rgba(255,204,0,0.2)', marginBottom: 12 }}>
              {loading ? <><span className="spinner" />SENDING OTP...</> : <><KeyRound size={14} />SEND RESET CODE</>}
            </button>

            <button type="button" className="btn btn-ghost btn-full" onClick={backToLogin} style={{ fontSize: 12 }}>
              ← BACK TO LOGIN
            </button>
          </form>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            FORGOT — Step 2: Verify reset OTP
        ══════════════════════════════════════════════════════════════════ */}
        {step === 'forgot_otp' && (
          <div>
            <div style={{ height: 2, background: 'linear-gradient(90deg,var(--yellow),transparent)', marginBottom: 20, borderRadius: 1 }} />

            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <KeyRound size={40} color="var(--yellow)" style={{ filter: 'drop-shadow(0 0 10px var(--yellow))', marginBottom: 12 }} />
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text-primary)', letterSpacing: 2, marginBottom: 6 }}>
                RESET VERIFICATION
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)' }}>
                Reset code sent to <span style={{ color: 'var(--yellow)' }}>{fpMaskedEmail}</span>
              </div>
            </div>

            {/* OTP boxes in yellow */}
            <div className="otp-container">
              {fpOtp.map((d, i) => (
                <input key={i}
                  ref={el => fpOtpRefs.current[i] = el}
                  className="otp-digit"
                  style={{ borderColor: d ? 'var(--yellow)' : undefined, color: 'var(--yellow)' }}
                  maxLength={1} value={d}
                  onChange={e => {
                    if (!/^\d*$/.test(e.target.value)) return;
                    const next = [...fpOtp]; next[i] = e.target.value.slice(-1); setFpOtp(next);
                    if (e.target.value && i < 5) fpOtpRefs.current[i + 1]?.focus();
                  }}
                  onKeyDown={e => { if (e.key === 'Backspace' && !fpOtp[i] && i > 0) fpOtpRefs.current[i - 1]?.focus(); }}
                  inputMode="numeric" autoFocus={i === 0}
                />
              ))}
            </div>

            {fpTimer > 0 && (
              <div style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>
                Expires in <span style={{ color: fpTimer < 60 ? 'var(--red)' : 'var(--yellow)' }}>{fmtTime(fpTimer)}</span>
              </div>
            )}

            <button className="btn btn-full" onClick={handleVerifyForgotOtp}
              disabled={loading || fpOtp.join('').length !== 6}
              style={{ background: 'linear-gradient(135deg,#332200,#443300)', color: 'var(--yellow)', border: '1px solid var(--yellow)', boxShadow: '0 0 10px rgba(255,204,0,0.2)', marginBottom: 12 }}>
              {loading ? <><span className="spinner" />VERIFYING...</> : <><Shield size={14} />CONFIRM CODE</>}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-ghost" onClick={() => setStep('forgot_request')} style={{ fontSize: 11 }}>
                ← BACK
              </button>
              <button className="btn btn-ghost" onClick={handleResendForgotOtp} disabled={fpTimer > 0} style={{ fontSize: 11 }}>
                {fpTimer > 0 ? `RESEND (${fmtTime(fpTimer)})` : 'RESEND CODE'}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            FORGOT — Step 3: Set new password
        ══════════════════════════════════════════════════════════════════ */}
        {step === 'forgot_reset' && (
          <form onSubmit={handleResetPassword}>
            <div style={{ height: 2, background: 'linear-gradient(90deg,var(--green),transparent)', marginBottom: 20, borderRadius: 1 }} />

            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <CheckCircle size={40} color="var(--green)" style={{ filter: 'drop-shadow(0 0 10px var(--green))', marginBottom: 12 }} />
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text-primary)', letterSpacing: 2, marginBottom: 6 }}>
                SET NEW PASSWORD
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)' }}>
                Account: <span style={{ color: 'var(--cyan)' }}>{fpUsername}</span>
              </div>
            </div>

            {/* New password */}
            <div className="input-group">
              <label className="input-label" style={{ color: 'var(--green)' }}>
                <Lock size={12} style={{ display: 'inline', marginRight: 5 }} />New Password
              </label>
              <div className="input-with-icon" style={{ position: 'relative' }}>
                <Lock size={16} className="input-icon" />
                <input className="input-field" type={showNewPass ? 'text' : 'password'}
                  placeholder="Min 8 characters"
                  value={fpNewPassword} onChange={e => setFpNewPassword(e.target.value)}
                  style={{ paddingRight: 40 }} autoFocus />
                <button type="button" onClick={() => setShowNewPass(!showNewPass)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                  {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Strength bar */}
              {fpNewPassword.length > 0 && (() => {
                const s = strength(fpNewPassword);
                return (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                      {[1,2,3,4].map(i => (
                        <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: s >= i ? strengthColor(s) : 'var(--border)', transition: 'background 0.3s' }} />
                      ))}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: strengthColor(s), letterSpacing: 1 }}>
                      {strengthLabel(s)}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Confirm password */}
            <div className="input-group">
              <label className="input-label" style={{ color: 'var(--green)' }}>
                <Lock size={12} style={{ display: 'inline', marginRight: 5 }} />Confirm Password
              </label>
              <div className="input-with-icon">
                <Lock size={16} className="input-icon" />
                <input className="input-field" type="password"
                  placeholder="Re-enter password"
                  value={fpConfirmPassword} onChange={e => setFpConfirmPassword(e.target.value)}
                  style={{ borderColor: fpConfirmPassword && fpNewPassword !== fpConfirmPassword ? 'var(--red)' : fpConfirmPassword && fpNewPassword === fpConfirmPassword ? 'var(--green)' : undefined }} />
              </div>
              {fpConfirmPassword && fpNewPassword !== fpConfirmPassword && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)', marginTop: 4 }}>
                  ✗ Passwords do not match
                </div>
              )}
              {fpConfirmPassword && fpNewPassword === fpConfirmPassword && fpNewPassword.length >= 8 && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--green)', marginTop: 4 }}>
                  ✓ Passwords match
                </div>
              )}
            </div>

            {/* Rules reminder */}
            <div style={{ padding: '10px 14px', background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 3, marginBottom: 16, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
              {['At least 8 characters','One uppercase letter','One number','One special character (@#$%!)'].map((rule, i) => {
                const checks = [fpNewPassword.length>=8, /[A-Z]/.test(fpNewPassword), /[0-9]/.test(fpNewPassword), /[^A-Za-z0-9]/.test(fpNewPassword)];
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: i < 3 ? 4 : 0 }}>
                    <span style={{ color: checks[i] ? 'var(--green)' : 'var(--text-dim)' }}>{checks[i] ? '✓' : '○'}</span>
                    <span style={{ color: checks[i] ? 'var(--green)' : 'var(--text-dim)' }}>{rule}</span>
                  </div>
                );
              })}
            </div>

            <button type="submit" className="btn btn-success btn-full" disabled={loading || fpNewPassword.length < 8 || fpNewPassword !== fpConfirmPassword}>
              {loading ? <><span className="spinner" />UPDATING...</> : <><RotateCcw size={14} />RESET PASSWORD</>}
            </button>

            <button type="button" className="btn btn-ghost btn-full" onClick={backToLogin} style={{ marginTop: 10, fontSize: 12 }}>
              ← BACK TO LOGIN
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
