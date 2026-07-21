import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

let inMemoryToken = null;

export const setMemoryToken = (token) => {
  inMemoryToken = token;
};

export const getMemoryToken = () => {
  return inMemoryToken;
};

const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to automatically attach authorization header
axiosInstance.interceptors.request.use(
  (config) => {
    const token = inMemoryToken || localStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Queue system for handling multiple concurrent requests when token is refreshing
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor to intercept 401s and attempt transparent token refreshing
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do not attempt transparent refresh on login or refresh calls
    if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    // Check if error status is 401 Unauthorized and request has not already been retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request and wait for token refresh to complete
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Request a new access token using the httpOnly cookie
        const refreshResponse = await axios.post(`${API_URL}/auth/refresh`, {}, {
          withCredentials: true
        });

        const { accessToken } = refreshResponse.data;
        setMemoryToken(accessToken);

        if (window.__onAccessTokenRefreshed) {
          window.__onAccessTokenRefreshed(accessToken);
        }

        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        isRefreshing = false;

        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        setMemoryToken(null);
        
        // Clear local storage and direct to login on session expiry
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        
        if (window.__onAuthSessionExpired) {
          window.__onAuthSessionExpired();
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
