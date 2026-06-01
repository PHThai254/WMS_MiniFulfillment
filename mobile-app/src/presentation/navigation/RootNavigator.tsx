// mobile-app/src/presentation/navigation/RootNavigator.tsx
// Tuần 6 & 7 - Đức Anh: Thêm Stack Navigator bọc MainTabs để có thể navigate
// đến các màn hình scanner (PutAway, PickingList, PickingDetail) từ HomeScreen.

import React from 'react';
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

export const RootNavigator = () => {
  const { isLoading, isSignedIn } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return isSignedIn ? <AppStack /> : <AuthStack />;
};
