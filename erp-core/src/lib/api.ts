import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to attach the token if stored in localStorage (optional, but good practice)
api.interceptors.request.use((config) => {
    // If you are using cookies for auth, this might not be needed unless for CSRF
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;
