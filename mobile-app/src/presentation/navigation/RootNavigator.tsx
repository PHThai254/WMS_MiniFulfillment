// mobile-app/src/presentation/navigation/RootNavigator.tsx
// Tuần 6 & 7 - Đức Anh: Thêm Stack Navigator bọc MainTabs để có thể navigate
// đến các màn hình scanner (PutAway, PickingList, PickingDetail) từ HomeScreen.

import React from 'react';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import { PutAwayScreen } from '../pages/PutAway';
import { PickingListScreen } from '../pages/PickingList';
import { PickingDetailScreen } from '../pages/PickingDetail';

const RootStack = createNativeStackNavigator();

/**
 * AppStack: Bọc MainTabs bên trong một Stack Navigator.
 * Các màn hình scanner (không phải tab) được thêm vào đây để có thể
 * navigate từ HomeScreen mà không bị hiển thị trong tab bar.
 */
const AppStack = () => (
  <RootStack.Navigator screenOptions={{ headerShown: false }}>
    {/* Bottom Tabs chính */}
    <RootStack.Screen name="MainTabs" component={MainTabs} />

    {/* === Tuần 6: Luồng Put-away (Inbound Mobile) === */}
    <RootStack.Screen
      name="PutAway"
      component={PutAwayScreen}
      options={{ animation: 'slide_from_right' }}
    />

    {/* === Tuần 7: Luồng Picking (Outbound Mobile) === */}
    <RootStack.Screen
      name="PickingList"
      component={PickingListScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <RootStack.Screen
      name="PickingDetail"
      component={PickingDetailScreen}
      options={{ animation: 'slide_from_bottom' }}
    />
  </RootStack.Navigator>
);

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

  return isSignedIn ? <AppStack /> : <AuthStack />;

