import axios from 'axios';

// Determine API URL based on environment
const getApiUrl = () => {
    // Use environment variable if set (for Vercel/Netlify deployment)
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    // Fall back to relative path (for same-domain deployment)
    return '/api';
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
