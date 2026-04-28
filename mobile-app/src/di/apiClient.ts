import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { authEventEmitter } from './authEvents';

// Định nghĩa type cho response từ Backend
interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

interface TokenData {
  accessToken: string;
  refreshToken: string;
}

// Khởi tạo Axios instance
const apiClient: AxiosInstance = axios.create({
  // baseURL: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5000',
  baseURL: 'http://10.0.2.2:5288',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// ============================================
// REQUEST INTERCEPTOR: Gắn AccessToken vào Header
// ============================================
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const accessToken = await SecureStore.getItemAsync('accessToken');
      if (accessToken && config.headers) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    } catch (error) {
      console.error('❌ Lỗi khi lấy AccessToken từ SecureStore:', error);
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// ============================================
// RESPONSE INTERCEPTOR: Xử lý 401 & Auto Refresh Token
// ============================================
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Dặn Interceptor bỏ qua, không can thiệp vào API Login
    if (originalRequest.url?.includes('/api/auth/login')) {
      return Promise.reject(error);
    }

    // Kiểm tra nếu lỗi 401 và chưa retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Lấy RefreshToken từ SecureStore
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        const accessToken = await SecureStore.getItemAsync('accessToken');

        if (!refreshToken || !accessToken) {
          // Token không tồn tại -> Redirect to Login
          console.warn('⚠️ Không có RefreshToken, yêu cầu đăng nhập lại');
          throw new Error('NO_REFRESH_TOKEN');
        }

        // Gọi API Refresh Token với đúng payload Backend yêu cầu
        const refreshResponse = await axios.post<ApiResponse<TokenData>>(
          `${process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/api/auth/refresh-token`,
          {
            AccessToken: accessToken,
            RefreshToken: refreshToken,
          },
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }

        );

        // Kiểm tra API thành công
        if (refreshResponse.data.success && refreshResponse.data.data) {
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = refreshResponse.data.data;

          // Lưu token mới vào SecureStore
          await SecureStore.setItemAsync('accessToken', newAccessToken);
          await SecureStore.setItemAsync('refreshToken', newRefreshToken);

          // Update header của request gốc với token mới
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }

          // Retry request gốc với token mới
          return apiClient(originalRequest);
        } else {
          throw new Error('REFRESH_FAILED');
        }
      } catch (refreshError) {
        console.error('❌ Lỗi khi refresh token:', refreshError);

        // Xóa token cũ và redirect to Login
        try {
          await SecureStore.deleteItemAsync('accessToken');
          await SecureStore.deleteItemAsync('refreshToken');
        } catch (deleteError) {
          console.error('❌ Lỗi khi xóa token:', deleteError);
        }

        // Emit event để App navigate to Login
        authEventEmitter.emit({
          type: 'TOKEN_EXPIRED',
          payload: { error: refreshError },
        });

        return Promise.reject(new Error('TOKEN_EXPIRED'));
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
export type { ApiResponse, TokenData };