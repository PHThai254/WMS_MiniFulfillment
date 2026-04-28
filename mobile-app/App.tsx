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

import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { Provider as PaperProvider } from "react-native-paper";
import { authEventEmitter } from "./src/di/authEvents";
import { AuthProvider, useAuth } from "./src/presentation/context/AuthContext";
import { RootNavigator } from "./src/presentation/navigation/RootNavigator";

/**
 * Bọc Root Navigator bên trong AuthProvider để có thể access useAuth hook
 */
const RootApp = () => {
  const navigationRef = React.useRef<any>(null);
  const { signOut } = useAuth();

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

  return (
    <NavigationContainer ref={navigationRef}>
      <RootNavigator />
    </NavigationContainer>
  );
};

function App() {
  return (
    <PaperProvider>
      <AuthProvider>
        <RootApp />
      </AuthProvider>
    </PaperProvider>
  );
}

export default App;