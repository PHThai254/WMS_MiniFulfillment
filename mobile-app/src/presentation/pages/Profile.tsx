import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

export const ProfileScreen = ({ navigation }: any) => {
  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Profile</Text>
      </View>

      {/* CONTENT */}
      <View style={styles.content}>
        <Text>Tên: Admin</Text>
        <Text>Email: admin@gmail.com</Text>
      </View>

      {/* FOOTER */}
      <View style={styles.footer}>

        <TouchableOpacity onPress={() => navigation.navigate("Home")}>
          <Text style={styles.icon}>🏠</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
          <Text style={styles.icon}>👤</Text>
        </TouchableOpacity>

      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 80,
    backgroundColor: "#4A90E2",
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    fontSize: 22,
    color: "#fff",
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    height: 70,
    backgroundColor: "#ccc",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  icon: {
    fontSize: 30,
  },
});