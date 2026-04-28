import apiClient, { type ApiResponse, type TokenData } from '../di/apiClient';

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
};

/**
 * Đăng nhập với username và password
 * @param username - Tên đăng nhập
 * @param password - Mật khẩu
 * @returns Promise chứa accessToken và refreshToken
 */
export const login = async (
  username: string,
  password: string
): Promise<LoginResponse> => {
  try {
    const response = await apiClient.post<ApiResponse<TokenData>>('/api/auth/login', {
      Username: username,
      Password: password,
    });

    if (!response.data?.succeeded) {
      throw new Error(response.data?.message || 'Đăng nhập thất bại');
    }

    const payload = response.data?.data;
    if (!payload?.accessToken || !payload?.refreshToken) {
      throw new Error('Server trả về dữ liệu đăng nhập không hợp lệ');
    }

    return {
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
    };
  } catch (error: any) {
    console.error('❌ Lỗi đăng nhập:', error.message);
    throw error;
  }
};
