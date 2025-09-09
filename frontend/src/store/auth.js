import { create } from 'zustand';
import { api, setAuth } from '../lib/api';

export const useAuth = create((set, get) => ({
  token: localStorage.getItem('token') || null,
  user: null,
  async bootstrap() {
    const t = get().token;
    if (!t) return;
    setAuth(t);
    try {
      const r = await api.get('/auth/me');
      set({ user: r.data });
    } catch {
      localStorage.removeItem('token'); setAuth(null); set({ token: null, user: null });
    }
  },
  async login(email, password) {
    const r = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', r.data.token); setAuth(r.data.token);
    set({ token: r.data.token }); await get().bootstrap();
  },
  async register(name, email, password) {
    const r = await api.post('/auth/register', { name, email, password });
    localStorage.setItem('token', r.data.token); setAuth(r.data.token);
    set({ token: r.data.token }); await get().bootstrap();
  },
  logout() {
    localStorage.removeItem('token'); setAuth(null);
    set({ token: null, user: null });
  }
}));
