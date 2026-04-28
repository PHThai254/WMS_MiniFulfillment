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
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Provider as PaperProvider } from "react-native-paper";
import { authEventEmitter } from "./src/di/authEvents";

import { LoginScreen } from "./src/presentation/pages/Login";
import { HomeScreen } from "./src/presentation/pages/Home";

const Stack = createNativeStackNavigator();

function App() {
  const navigationRef = React.useRef<any>(null);

  useEffect(() => {
    // Subscribe to auth events
    const unsubscribe = authEventEmitter.subscribe((event) => {
      if (event.type === 'TOKEN_EXPIRED') {
        console.log('🔐 Token hết hạn, navigate to Login');
        navigationRef.current?.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
    });

    return unsubscribe;
  }, []);

  return (
    <PaperProvider>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator initialRouteName="Login">
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
          />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}

export default App;