import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';
import type { ApiResponse } from '../types/api';

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5288';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Auto add JWT to Authorization header
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor: Handle 401 with token refresh
apiClient.interceptors.response.use(
    (response) => {
        // Extract data from ApiResponse wrapper
        if (response.data && typeof response.data === 'object' && 'success' in response.data) {
            return response.data as ApiResponse;
        }
        return response.data;
    },
    async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Handle 401 - Token expired or invalid
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refreshToken');
                const accessToken = localStorage.getItem('accessToken');

                if (!refreshToken) {
                    // No refresh token, redirect to login
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    window.location.href = '/login';
                    return Promise.reject(error);
                }

                // Call refresh token endpoint
                const response = await axios.post(`${BASE_URL}/api/auth/refresh-token`, {
                    accessToken,
                    refreshToken,
                });

                if (response.data && response.data.success) {
                    const newAccessToken = response.data.data.accessToken;
                    const newRefreshToken = response.data.data.refreshToken;

                    // Store new tokens
                    localStorage.setItem('accessToken', newAccessToken);
                    localStorage.setItem('refreshToken', newRefreshToken);

                    // Retry original request with new token
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    return apiClient(originalRequest);
                }
            } catch (refreshError) {
                // Refresh failed, redirect to login
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;
