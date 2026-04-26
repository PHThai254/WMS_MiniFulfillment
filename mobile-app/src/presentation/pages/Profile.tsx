import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, Avatar, Button, Card } from "react-native-paper";

export const ProfileScreen = () => {
  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content style={{ alignItems: "center" }}>
          <Avatar.Icon size={80} icon="account" />
          <Text variant="titleLarge" style={{ marginTop: 10 }}>
            Admin
          </Text>
          <Text>admin@gmail.com</Text>

          <Button mode="contained" style={styles.btn}>
            Đăng xuất
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    borderRadius: 16,
  },
  btn: {
    marginTop: 20,
  },
});