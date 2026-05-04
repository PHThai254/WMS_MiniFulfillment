import { create } from 'zustand';
import axios from 'axios';
import apiClient, { BASE_URL } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import type { ApiResponse } from '../types/api';
import type { AuthContextType, IUser, LoginResponse, RefreshTokenResponse } from '../types/auth';

interface AuthState extends AuthContextType {
    initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    initialize: async () => {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            set({ user: null, isAuthenticated: false, isLoading: false });
            return;
        }

        try {
            const response = (await apiClient.get(API_ENDPOINTS.auth.me)) as ApiResponse<IUser>;
            if (response?.success && response?.data) {
                set({ user: response.data, isAuthenticated: true, isLoading: false });
                return;
            }
        } catch {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
        }

        set({ user: null, isAuthenticated: false, isLoading: false });
    },
    login: async (username: string, password: string) => {
        const response = (await apiClient.post(API_ENDPOINTS.auth.login, {
            username,
            password,
        })) as ApiResponse<LoginResponse>;

        if (response?.success && response?.data) {
            const { accessToken, refreshToken, user } = response.data;
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);
            set({ user: user ?? null, isAuthenticated: true });
            return;
        }

        throw new Error(response?.message || 'Login failed');
    },
    logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('warehouseId');
        set({ user: null, isAuthenticated: false });
    },
    refreshToken: async () => {
        const currentAccessToken = localStorage.getItem('accessToken');
        const currentRefreshToken = localStorage.getItem('refreshToken');

        if (!currentRefreshToken) {
            return false;
        }

        try {
            const response = await axios.post<ApiResponse<RefreshTokenResponse>>(
                `${BASE_URL}${API_ENDPOINTS.auth.refreshToken}`,
                {
                    accessToken: currentAccessToken,
                    refreshToken: currentRefreshToken,
                }
            );

            if (response.data?.success && response.data.data) {
                localStorage.setItem('accessToken', response.data.data.accessToken);
                localStorage.setItem('refreshToken', response.data.data.refreshToken);
                return true;
            }
        } catch {
            return false;
        }

        return false;
    },
    hasRole: (role: string) => {
        return get().user?.role === role;
    },
    canAccessWarehouse: (warehouseId: string) => {
        const user = get().user;
        if (user?.role === 'Admin') return true;
        return user?.warehouseId === warehouseId;
    },
}));
