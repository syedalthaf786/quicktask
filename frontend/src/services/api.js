import axios from 'axios';

// Determine API URL based on environment
const getApiUrl = () => {
    // In production, use relative path (same domain)
    if (import.meta.env.PROD) {
        return '/api';
    }
    // In development, use environment variable or default
    return import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
};

// Create axios instance
const api = axios.create({
    baseURL: getApiUrl(),
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor to add token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
