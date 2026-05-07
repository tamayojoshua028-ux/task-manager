const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, '');

export const buildApiUrl = (path = '') => {
  if (!path) {
    return API_BASE_URL;
  }

  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};
