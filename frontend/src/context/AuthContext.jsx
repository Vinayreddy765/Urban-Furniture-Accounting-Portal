import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../utils/api.js';

export const ROLES = { ADMIN: 'Administrator', INVOICING_USER: 'Accountant', CONTACT: 'User' };
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('uf_user') || 'null'); } catch { return null; }
  });
  const [loading, setLoading] = useState(!!localStorage.getItem('uf_token'));
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!localStorage.getItem('uf_token')) { setLoading(false); return; }
    api.get('/auth/me').then(setUser).catch(() => { localStorage.removeItem('uf_token'); localStorage.removeItem('uf_user'); setUser(null); }).finally(() => setLoading(false));
  }, []);

  const login = async (loginId, password) => {
    try {
      const result = await api.post('/auth/login', { loginId: loginId.trim(), password });
      localStorage.setItem('uf_token', result.token);
      localStorage.setItem('uf_user', JSON.stringify(result.user));
      setUser(result.user);
      return { ok: true, user: result.user };
    } catch (e) { return { ok: false, error: e.message }; }
  };

  const register = async ({ name, loginId, email, password }) => {
    try {
      const result = await api.post('/auth/signup', { name, loginId, email, password });
      localStorage.setItem('uf_token', result.token);
      localStorage.setItem('uf_user', JSON.stringify(result.user));
      setUser(result.user);
      return { ok: true, user: result.user };
    } catch (e) { return { ok: false, error: e.message }; }
  };

  const loadUsers = useCallback(async () => {
    const result = await api.get('/auth/users');
    setUsers(result || []);
    return result || [];
  }, []);

  const createUser = useCallback(async (payload) => {
    const result = await api.post('/auth/create-user', payload);
    await loadUsers();
    return result;
  }, [loadUsers]);

  const setUserActive = useCallback(async (id, isActive) => {
    const result = await api.patch(`/auth/users/${id}/status`, { isActive });
    await loadUsers();
    return result;
  }, [loadUsers]);

  const logout = () => { localStorage.removeItem('uf_token'); localStorage.removeItem('uf_user'); setUser(null); };
  const can = (action) => {
    if (!user) return false;
    if (user.role === ROLES.ADMIN) return true;
    if (user.role === ROLES.INVOICING_USER) return action !== 'archive';
    return ['viewOwn', 'pay'].includes(action);
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-paper text-sm text-inksoft">Loading session…</div>;
  return <AuthContext.Provider value={{ user, users, login, register, logout, can, loadUsers, createUser, setUserActive }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
