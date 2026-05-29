import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('token');
      const savedUser  = localStorage.getItem('user');
      if (savedToken && savedUser && savedUser !== 'undefined') {
        const parsed = JSON.parse(savedUser);
        console.log('[AuthContext] Restored user from storage:', parsed);
        setToken(savedToken);
        setUser(parsed);
      }
    } catch (e) {
      console.error('[AuthContext] Failed to restore session:', e);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    setLoading(false);
  }, []);

  const login = (tokenVal, userData) => {
    console.log('[AuthContext] login() called | token:', tokenVal?.slice(0,20) + '...' , '| user:', userData);
    if (!tokenVal || !userData) {
      console.error('[AuthContext] login() called with empty token or user — not saving');
      return;
    }
    setToken(tokenVal);
    setUser(userData);
    localStorage.setItem('token', tokenVal);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  // isAdmin: true only when role is exactly 'ADMIN' (string)
  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
