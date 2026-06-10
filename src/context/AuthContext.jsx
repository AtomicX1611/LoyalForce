/**
 * src/context/AuthContext.jsx
 *
 * Global authentication state via React Context.
 *
 * Provides:
 *  - token     : string | null — the current JWT
 *  - user      : { email, tenant_id } | null
 *  - login()   : calls POST /api/auth/mock-login, stores token + user
 *  - logout()  : clears token + user, redirects to /login
 *  - isLoading : true while restoring session from localStorage
 *
 * Token persistence: stored in localStorage under 'lf_token' / 'lf_user'.
 * On mount, the context tries to restore the session from storage so the
 * user is not logged out on a page refresh.
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken]     = useState(null);
  const [user, setUser]       = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Restore session from localStorage on first mount
  useEffect(() => {
    const storedToken = localStorage.getItem('lf_token');
    const storedUser  = localStorage.getItem('lf_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  /**
   * Authenticate against the backend.
   * Returns { success: true } or { success: false, message: string }.
   */
  const login = async (email, airlineId) => {
    try {
      const { data } = await api.post('/auth/mock-login', {
        email,
        airline_id: airlineId,
      });

      localStorage.setItem('lf_token', data.token);
      localStorage.setItem('lf_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      navigate('/');
      return { success: true };
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        'Login failed. Check your airline ID and try again.';
      return { success: false, message };
    }
  };

  const logout = () => {
    localStorage.removeItem('lf_token');
    localStorage.removeItem('lf_user');
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Convenience hook
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
