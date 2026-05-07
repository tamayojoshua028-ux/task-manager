import axios from 'axios';
import { API_BASE_URL } from './config';

const API = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to every request
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`📤 ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Log responses
API.interceptors.response.use(
  (response) => {
    console.log(`📥 ${response.config.url}:`, response.data);
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export default API;
