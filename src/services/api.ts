import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE

const instance = axios.create({
  baseURL: `${API_BASE}`,
});

// ✅ Add token to every request if present
instance.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ✅ Add response interceptor for global 401 redirection
instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (typeof window !== 'undefined' && error?.response?.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/portal/auth/login';
      }
      return Promise.reject(error);
    }
  );

export default instance;