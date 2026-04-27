import axios from "axios";

const API_BASE_URL = "http://10.0.2.2:8000";

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
};

export const login = async (
  username: string,
  password: string
): Promise<LoginResponse> => {
  const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
    Username: username,
    Password: password,
  });

  if (!response.data?.succeeded) {
    throw new Error(response.data?.message || "Đăng nhập thất bại");
  }

  const payload = response.data?.data;
  if (!payload?.accessToken || !payload?.refreshToken) {
    throw new Error("Server trả về dữ liệu đăng nhập không hợp lệ");
  }

  return {
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
  };
};
