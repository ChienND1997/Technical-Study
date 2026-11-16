import { api } from '@/shared/api/client.js';

export const fetchAuthConfig = () => api('/auth/config');
export const fetchMe = () => api('/auth/me');
export const loginGoogle = (credential) => api('/auth/google', { method: 'POST', body: { credential } });
export const logout = () => api('/auth/logout', { method: 'POST', body: {} });
export const loginAdmin = (body) => api('/auth/admin', { method: 'POST', body });
export const loginPassword = (body) => api('/auth/login', { method: 'POST', body });
