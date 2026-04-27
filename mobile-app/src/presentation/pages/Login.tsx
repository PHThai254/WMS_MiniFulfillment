import React, { useState } from "react";
import { SafeAreaView, StyleSheet, Alert } from "react-native";
import { TextInput, Button, Text, Card } from "react-native-paper";
import { login } from "../../infrastructure/authService";

export const LoginScreen = ({ navigation }: any) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập username và password.");
      return;
    }

    try {
      setLoading(true);

      const { accessToken, refreshToken } = await login(username.trim(), password);

      console.log("AccessToken:", accessToken);
      console.log("RefreshToken:", refreshToken);

      Alert.alert("Thành công", "Đăng nhập thành công.");
      navigation.navigate("Home");
    } catch (error: any) {
      console.log(error.response?.data || error.message || error);
      Alert.alert("Lỗi", "Sai tài khoản hoặc mật khẩu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={[styles.title, { fontSize: 24, fontWeight: 'bold' }]}>
            WMS Login
          </Text>

          <TextInput
            label="Username"
            value={username}
            onChangeText={setUsername}
            style={styles.input}
            mode="outlined"
            autoCapitalize="none"
            returnKeyType="next"
          />

          <TextInput
            label="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            mode="outlined"
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            Đăng nhập
          </Button>
        </Card.Content>
      </Card>
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
  card: {
    borderRadius: 16,
    padding: 16,
  },
  title: {
    textAlign: "center",
    marginBottom: 24,
    fontWeight: "bold",
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
});

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#4A90E2",
//     justifyContent: "center",
//     padding: 20,
//   },
//   card: {
//     borderRadius: 16,
//     padding: 10,
//   },
//   title: {
//     textAlign: "center",
//     marginBottom: 20,
//     fontSize: 22,
//     fontWeight: "bold",
//   },
//   input: {
//     marginBottom: 12,
//   },
// });

// export const LoginScreen = ({ navigation }: any) => {
//   return (
//     <View>
//       <Text>Test OK</Text>
//     </View>
//   );
// };