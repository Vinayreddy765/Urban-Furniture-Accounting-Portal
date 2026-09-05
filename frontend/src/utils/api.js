const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('uf_token');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  let body = null;
  try { body = await response.json(); } catch { body = null; }
  if (!response.ok || body?.success === false) {
    const message = body?.error?.message || body?.error || body?.message || `Request failed (${response.status})`;
    const err = new Error(typeof message === 'string' ? message : 'Request failed');
    err.status = response.status;
    throw err;
  }
  return body?.data ?? body;
}

export const api = {
  get: (path) => apiFetch(path),
  post: (path, data) => apiFetch(path, { method: 'POST', body: JSON.stringify(data) }),
  put: (path, data) => apiFetch(path, { method: 'PUT', body: JSON.stringify(data) }),
  patch: (path, data) => apiFetch(path, { method: 'PATCH', body: JSON.stringify(data) }),
};
