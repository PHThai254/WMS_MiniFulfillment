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

import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Provider as PaperProvider } from "react-native-paper";

import { LoginScreen } from "./src/presentation/pages/Login";
import { HomeScreen } from "./src/presentation/pages/Home";

const Stack = createNativeStackNavigator();

function App() {
  return (
    <PaperProvider>
      <NavigationContainer>
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