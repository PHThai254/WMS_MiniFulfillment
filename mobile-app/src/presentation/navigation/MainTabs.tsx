// mobile-app/src/presentation/navigation/MainTabs.tsx
import {PickingScanner} from '../../components/PickingScanner'; 
import {PutAwayScanner} from '../../components/PutAwayScanner'; // ✅ Staff cất hàng
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { HomeScreen } from '../pages/Home';
import { ProfileScreen } from '../pages/Profile';
import { SettingsScreen } from '../pages/Setting';

const Tab = createBottomTabNavigator();

export const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#4A90E2',
        tabBarInactiveTintColor: '#9CA3AF',
        headerShown: true,
        headerStyle: {
          backgroundColor: '#4A90E2',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Trang chủ',
          tabBarLabel: 'Trang chủ',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Tài khoản',
          tabBarLabel: 'Tài khoản',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Cài đặt',
          tabBarLabel: 'Cài đặt',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="Scanner" 
        component={PickingScanner} 
        options={{ 
            title: 'Nhặt Hàng', 
            tabBarLabel: 'Nhặt Hàng',
            tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="barcode-scan" color={color} size={size} />
            ),
        }} 
        />
      {/* ✅ Tab Cất Hàng: Dành cho Staff thực hiện Put-away sau khi QA_QC duyệt phiếu nhập */}
      <Tab.Screen 
        name="PutAway" 
        component={PutAwayScanner} 
        options={{ 
            title: 'Cất Hàng', 
            tabBarLabel: 'Cất Hàng',
            tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="package-down" color={color} size={size} />
            ),
        }} 
        />
    </Tab.Navigator>
  );
};
