// import React from "react";
// import { Provider as PaperProvider } from "react-native-paper";
// import { LoginScreen } from "./src/presentation/pages/Login";

// function App() {
//   return (
//     <PaperProvider>
//       <LoginScreen />
//     </PaperProvider>
//   );
// }

// export default App;

import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { useNetInfo } from "@react-native-community/netinfo";
import { Provider as PaperProvider } from "react-native-paper";
import { authEventEmitter } from "./src/di/authEvents";
import { AuthProvider, useAuth } from "./src/presentation/context/AuthContext";
import { OfflineQueueProvider } from "./src/presentation/context/OfflineQueueContext";
import { RootNavigator } from "./src/presentation/navigation/RootNavigator";
import { OfflineIndicator } from "./src/components/OfflineIndicator";
import {
  getPendingScanActions,
  processPendingScanActions,
} from "./src/infrastructure/offlineQueue";

/**
 * Bọc Root Navigator bên trong AuthProvider để có thể access useAuth hook
 */
const RootApp = () => {
  const navigationRef = React.useRef<any>(null);
  const { signOut } = useAuth();
  const netInfo = useNetInfo();
  const isOnline = netInfo.isConnected ?? false;
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Subscribe to auth events
    const unsubscribe = authEventEmitter.subscribe((event) => {
      if (event.type === 'TOKEN_EXPIRED') {
        console.log('🔐 Token hết hạn, đăng xuất');
        signOut();
      }
    });

    return unsubscribe;
  }, [signOut]);

  useEffect(() => {
    const loadPendingCount = async () => {
      const actions = await getPendingScanActions();
      setPendingCount(actions.length);
    };

    void loadPendingCount();

    const interval = setInterval(() => {
      void loadPendingCount();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isOnline) return;

    const syncPending = async () => {
      setIsSyncing(true);
      try {
        const remaining = await processPendingScanActions();
        setPendingCount(remaining);
      } finally {
        setIsSyncing(false);
      }
    };

    void syncPending();
  }, [isOnline]);

  const bannerText = useMemo(() => {
    if (!isOnline) {
      return '⚠️ Mất mạng - thao tác quét sẽ được lưu tạm và gửi lại khi có kết nối.';
    }

    if (isSyncing) {
      return `🔄 Đang đồng bộ ${pendingCount} thao tác lên máy chủ...`;
    }

    if (pendingCount > 0) {
      return `⏳ Có ${pendingCount} thao tác đang chờ đồng bộ.`;
    }

    return '';
  }, [isOnline, isSyncing, pendingCount]);

  return (
    <View style={styles.appContainer}>
      {bannerText !== '' && (
        <View style={[styles.banner, !isOnline ? styles.bannerOffline : styles.bannerSyncing]}>
          <Text style={styles.bannerText}>{bannerText}</Text>
        </View>
      )}
      <OfflineIndicator />
      <NavigationContainer ref={navigationRef}>
        <RootNavigator />
      </NavigationContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
  },
  banner: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  bannerOffline: {
    backgroundColor: '#fff4f4',
  },
  bannerSyncing: {
    backgroundColor: '#f5f9ff',
  },
  bannerText: {
    color: '#1f1f1f',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});

function App() {
  return (
    <PaperProvider>
      <OfflineQueueProvider>
        <AuthProvider>
          <RootApp />
        </AuthProvider>
      </OfflineQueueProvider>
    </PaperProvider>
  );
}

export default App;


// Test HomeScreen
// import React from "react";
// import { NavigationContainer } from "@react-navigation/native";
// import { createNativeStackNavigator } from "@react-navigation/native-stack";

// import { HomeScreen } from "./src/presentation/pages/Home";
// import { ProfileScreen } from "./src/presentation/pages/Profile";

// const Stack = createNativeStackNavigator();

// function App() {
//   return (
//     <NavigationContainer>
//       <Stack.Navigator initialRouteName="Home">

//         <Stack.Screen
//           name="Home"
//           component={HomeScreen}
//           options={{ headerShown: false }}
//         />

//         <Stack.Screen
//           name="Profile"
//           component={ProfileScreen}
//           options={{ headerShown: false }}
//         />

//       </Stack.Navigator>
//     </NavigationContainer>
//   );
// }

// export default App;