// mobile-app/src/presentation/navigation/RootNavigator.tsx
import React from 'react';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';

/**
 * UnauthorizedScreen - Hiển thị khi user đã đăng nhập nhưng không có quyền dùng app mobile.
 * Đây là lớp bảo vệ thứ 2 (lớp 1 ở Login.tsx), xử lý edge case khi token cũ được restore.
 */
const UnauthorizedScreen = ({ username, role }: { username: string; role: string }) => (
    <View style={unauthorizedStyles.container}>
        <Text style={unauthorizedStyles.icon}>⛔</Text>
        <Text style={unauthorizedStyles.title}>Không có quyền truy cập</Text>
        <Text style={unauthorizedStyles.message}>
            Tài khoản <Text style={unauthorizedStyles.bold}>{username}</Text> ({role}){'\n'}
            không được phép sử dụng app này.{'\n\n'}
            App dành riêng cho <Text style={unauthorizedStyles.bold}>Thủ kho (Staff)</Text>.{'\n'}
            Vui lòng sử dụng Web Admin.
        </Text>
    </View>
);

const unauthorizedStyles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#fff' },
    icon: { fontSize: 64, marginBottom: 16 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#d32f2f', marginBottom: 12 },
    message: { fontSize: 16, color: '#555', textAlign: 'center', lineHeight: 26 },
    bold: { fontWeight: 'bold', color: '#333' },
});

export const RootNavigator = () => {
  const { isLoading, isSignedIn, user } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  // ✅ Lớp bảo vệ thứ 2: Nếu đã đăng nhập nhưng không phải Staff (edge case)
  // → Hiển thị màn Unauthorized thay vì MainTabs
  if (isSignedIn && user?.role !== 'Staff') {
    return (
      <UnauthorizedScreen
        username={user?.username || 'Unknown'}
        role={user?.role || 'Unknown'}
      />
    );
  }

  return isSignedIn ? <MainTabs /> : <AuthStack />;
};
