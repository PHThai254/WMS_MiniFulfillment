import React, { useState } from "react";
import { SafeAreaView, StyleSheet, Alert } from "react-native";
import * as SecureStore from 'expo-secure-store';
import { LoginCard, LoginInput, PrimaryButton } from "../../components";
import apiClient from "../../di/apiClient"; // Đã thay đổi import này
import { useAuth } from "../context/AuthContext";

export const LoginScreen = ({ navigation }: any) => {
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập username và password");
      return;
    }

    try {
      setLoading(true);

      // 1. Gọi trực tiếp apiClient xuống Backend với đúng format Body
      const response = await apiClient.post('/api/auth/login', {
        Username: username.trim(),
        Password: password
      });

        // 2. Chặn cổng kiểm tra biến 'success' do C# trả về
        if (response.data.success) {
            const { accessToken, refreshToken } = response.data.data;

            await SecureStore.setItemAsync('accessToken', accessToken);
            await SecureStore.setItemAsync('refreshToken', refreshToken);

            console.log("✅ Đăng nhập thành công, Token đã được lưu!");

            try { 
                const meResponse = await apiClient.get('/api/Auth/me', {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });

                if (meResponse.data.success) {
                    const userData = meResponse.data.data;

                    // ✅ ROLE GUARD: App mobile CHỈ dành cho Staff (thủ kho).
                    // Admin và QA_QC phải sử dụng Web Admin.
                    if (userData.role !== 'Staff') {
                        // Xóa token vừa lưu để không duy trì session
                        await SecureStore.deleteItemAsync('accessToken');
                        await SecureStore.deleteItemAsync('refreshToken');
                        Alert.alert(
                            '⛔ Không có quyền truy cập',
                            `Tài khoản "${userData.username}" (${userData.role}) không được phép dùng app này.\n\nApp dành riêng cho Thủ kho (Staff).\nVui lòng sử dụng Web Admin.`,
                            [{ text: 'Đóng' }]
                        );
                        return; // Dừng lại, không gọi signIn()
                    }

                    await signIn({
                        username: userData.username,
                        role: userData.role,
                        warehouseName: userData.warehouseName
                    });
                }
            } catch (e) {
                console.error("Không kéo được thông tin user:", e);
                await signIn({ username: username.trim(), role: "Unknown" });
            }

        } else {
            console.warn("⚠️ Đăng nhập thất bại:", response.data.message);
            Alert.alert("Đăng nhập thất bại", response.data.message);
        }

    } catch (error: any) {
      // 3. Xử lý các lỗi sập mạng, sập server (HTTP 4xx, 5xx)
      const errorMsg = error.response?.data?.message || error.message || "Lỗi không xác định";
      console.error("❌ Lỗi hệ thống:", errorMsg);
      Alert.alert("Lỗi kết nối", "Không thể kết nối đến máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LoginCard title="WMS Login">
        <LoginInput
          label="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          returnKeyType="next"
        />

        <LoginInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />

        <PrimaryButton
          onPress={handleLogin}
          loading={loading}
          disabled={loading}
        >
          Đăng nhập
        </PrimaryButton>
      </LoginCard>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#4A90E2",
    justifyContent: "center",
    padding: 20,
  },
});