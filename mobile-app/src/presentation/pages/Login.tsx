import React, { useState } from "react";
import { SafeAreaView, StyleSheet, Alert } from "react-native";
import * as SecureStore from 'expo-secure-store';
import { LoginCard, LoginInput, PrimaryButton } from "../../components";
import { login } from "../../infrastructure/authService";

export const LoginScreen = ({ navigation }: any) => {
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

      // Gọi API login với apiClient (có Interceptor tự động)
      const { accessToken, refreshToken } = await login(username.trim(), password);

      // Lưu token vào SecureStore
      await SecureStore.setItemAsync('accessToken', accessToken);
      await SecureStore.setItemAsync('refreshToken', refreshToken);

      console.log("✅ Đăng nhập thành công");
      
      // Navigate to Home (reset stack để không thể back)
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || "Lỗi không xác định";
      console.error("❌ Lỗi đăng nhập:", errorMsg);
      Alert.alert("Lỗi đăng nhập", errorMsg);
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