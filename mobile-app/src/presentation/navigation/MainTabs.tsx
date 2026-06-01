import React from 'react';
import {
  createBottomTabNavigator,
  BottomTabNavigationProp,
} from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Screens
import { HomeScreen } from '../pages/Home';
import { ProfileScreen } from '../pages/Profile';
import { SettingsScreen } from '../pages/Setting';
import { PutAwayDetailScreen } from '../pages/PutAwayDetail';
import { PickingDetailScreen } from '../pages/PickingDetail';
import { HandoverScreen } from '../pages/Handover';

// Types
export type RootTabParamList = {
  HomeStack: undefined;
  Handover: undefined;
  Profile: undefined;
  Settings: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  PutAwayDetail: { receiptId: string; task?: any };
  PickingDetail: { issueId: string; task?: any };
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

// ──────────────────────────────────────────────────────────────────────
// 📊 HOME STACK (với nested screens)
// ──────────────────────────────────────────────────────────────────────
const HomeStackScreen = () => {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen
        name="PutAwayDetail"
        component={PutAwayDetailScreen}
        options={{
          title: 'Chi Tiết Cất Hàng',
        }}
      />
      <HomeStack.Screen
        name="PickingDetail"
        component={PickingDetailScreen}
        options={{
          title: 'Chi Tiết Nhặt Hàng',
        }}
      />
    </HomeStack.Navigator>
  );
};

// ──────────────────────────────────────────────────────────────────────
// 🎯 MAIN TABS
// ──────────────────────────────────────────────────────────────────────
export const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#4A90E2',
        tabBarInactiveTintColor: '#9CA3AF',

        headerShown: false,
        tabBarLabelStyle: {
          fontSize: 11,
          marginBottom: 4,
          fontWeight: '500',

        headerShown: false, // Header tự quản lý trong từng màn hình (Home có header riêng)
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
>>>>>>> 4e2e726 (hoàn thiện Put-Away, picking FIFO)
        },
      }}
    >
      {/* 🏠 HOME TAB - Danh sách công việc + detail screens */}
      <Tab.Screen
        name="HomeStack"
        component={HomeStackScreen}
        options={{
          title: 'Danh Sách',
          tabBarLabel: 'Danh Sách',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />

      {/* 🎁 HANDOVER TAB - Bàn giao hàng */}
      <Tab.Screen
        name="Handover"
        component={HandoverScreen}
        options={{
          title: 'Bàn Giao',
          tabBarLabel: 'Bàn Giao',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="package-down"
              color={color}
              size={size}
            />
          ),
        }}
      />

      {/* 👤 PROFILE TAB */}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Tài Khoản',
          tabBarLabel: 'Tài Khoản',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" color={color} size={size} />
          ),
        }}
      />

      {/* ⚙️ SETTINGS TAB */}
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Cài Đặt',
          tabBarLabel: 'Cài Đặt',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
