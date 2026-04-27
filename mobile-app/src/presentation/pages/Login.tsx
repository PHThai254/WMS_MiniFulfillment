import React, { useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { TextInput, Button, Text, Card } from "react-native-paper";
import axios from "axios";

export const LoginScreen = ({navigation }: any) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);

      const response = await axios.post(
        "http://10.0.2.2:8000/api/login/", // ⚠️ Android dùng 10.0.2.2 thay localhost
        {
          email: email,
          password: password,
        }
      );

      console.log("TOKEN:", response.data);

      Alert.alert("Thành công", "Đăng nhập OK");

    } catch (error: any) {
      console.log(error.response?.data || error.message);
      Alert.alert("Lỗi", "Sai tài khoản hoặc mật khẩu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>

          <Text style={styles.title}>WMS Login</Text>

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            mode="outlined"
          />

          <TextInput
            label="Password"
            secureTextEntry={true}
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            mode="outlined"
          />

          <Button 
            mode="contained" 
            onPress={() => navigation.navigate("Home")}
          >
            Login
          </Button>

        </Card.Content>
      </Card>
    </View>
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
    padding: 10,
  },
  title: {
    textAlign: "center",
    marginBottom: 20,
    fontSize: 22,
    fontWeight: "bold",
  },
  input: {
    marginBottom: 12,
  },
});

// export const LoginScreen = ({ navigation }: any) => {
//   return (
//     <View>
//       <Text>Test OK</Text>
//     </View>
//   );
// };