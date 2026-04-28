import React from "react";
import { View, StyleSheet, SafeAreaView } from "react-native";
import { Button, Text } from "react-native-paper";
import * as SecureStore from 'expo-secure-store';
import { useAuth } from "../context/AuthContext";

export const SettingsScreen = ({ navigation }: any) => {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Cài đặt</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tài khoản</Text>
          <Button 
            mode="contained" 
            onPress={handleLogout}
            style={styles.logoutButton}
          >
            Đăng xuất
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 24,
    color: "#333",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#666",
  },
  logoutButton: {
    marginTop: 8,
    backgroundColor: "#E74C3C",
  },
});
