import axios from 'axios';

const API_BASE = 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
  withCredentials: false,
});

// ── Attach JWT on EVERY request ───────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  } else {
    console.warn('[API] No token in localStorage — request will be unauthenticated:', config.url);
  }
  return config;
}, (error) => Promise.reject(error));

// ── Global response error handler ─────────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status  = err.response?.status;
    const url     = err.config?.url;
    const body    = err.response?.data;

    if (status === 401) {
      console.error('[API] 401 Unauthorized — token missing or expired. Redirecting to login.');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    if (status === 403) {
      console.error(
        `[API] 403 Forbidden on ${url}\n` +
        `Your authorities : ${body?.yourAuthorities ?? 'unknown'}\n` +
        `Required         : ${body?.requiredAuthority ?? 'ROLE_ADMIN'}\n` +
        `Hint             : ${body?.hint ?? 'Check DB role column'}`
      );
    }

    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register:       (data) => api.post('/auth/register', data),
  login:          (data) => api.post('/auth/login', data),
  verifyOtp:      (data) => api.post('/auth/verify-otp', data),
  resendOtp:      (data) => api.post('/auth/resend-otp', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  verifyResetOtp: (data) => api.post('/auth/verify-reset-otp', data),
  resetPassword:  (data) => api.post('/auth/reset-password', data),
};

// ── Accounts ──────────────────────────────────────────────────────────────────
export const accountApi = {
  getAll:  ()              => api.get('/accounts'),
  create:  (data)          => api.post('/accounts', data),
  getById: (id)            => api.get(`/accounts/${id}`),
  lookup:  (accountNumber) => api.get(`/accounts/lookup/${accountNumber}`),
};

// ── Transactions ──────────────────────────────────────────────────────────────
export const transactionApi = {
  requestOtp: ()     => api.post('/transactions/request-otp'),
  credit:     (data) => api.post('/transactions/credit', data),
  debit:      (data) => api.post('/transactions/debit', data),
  withdraw:   (data) => api.post('/transactions/withdraw', data),
  transfer:   (data) => api.post('/transactions/transfer', data),
  history:    (id)   => api.get(`/transactions/history/${id}`),
};

// ── Loans ─────────────────────────────────────────────────────────────────────
export const loanApi = {
  requestOtp:   ()       => api.post('/loans/request-otp'),
  apply:        (data)   => api.post('/loans/apply', data),
  getMy:        ()       => api.get('/loans/my'),
  calculateEmi: (params) => api.get('/loans/emi-calculator', { params }),
};

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminApi = {
  whoami:           () => api.get('/debug/whoami'),          // diagnose 403
  dashboard:        () => api.get('/admin/dashboard'),
  stats:            () => api.get('/admin/stats'),
  getUsers:         () => api.get('/admin/users'),
  getVendors:       () => api.get('/admin/vendors'),
  toggleUserStatus: (id) => api.put(`/admin/users/${id}/toggle-status`),
  getLoans:         () => api.get('/admin/loans'),
  approveLoan:      (id) => api.put(`/admin/loans/${id}/approve`),
  disburseLoan:     (id) => api.put(`/admin/loans/${id}/disburse`),
  getPendingKyc:    () => api.get('/admin/kyc/pending'),
  verifyKyc:        (id) => api.put(`/admin/kyc/${id}/verify`),
  rejectKyc:        (id) => api.put(`/admin/kyc/${id}/reject`),
  getTransactions:  () => api.get('/admin/transactions'),
  getAuditLogs:     () => api.get('/admin/audit-logs'),
};

export default api;
