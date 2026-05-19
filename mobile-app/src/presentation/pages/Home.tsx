
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from "react-native";

export const HomeScreen = ({ navigation }: any) => {
  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerText}>WMS</Text>
      </View>

      {/* SEARCH */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>⌕</Text>

        <TextInput
          placeholder="Tìm kiếm sản phẩm"
          placeholderTextColor="#777"
          style={styles.searchInput}
        />
      </View>

      {/* MENU */}
      <View style={styles.menuBar}>
        <Text style={styles.menuText}>☷ MENU</Text>
      </View>

      {/* GRID */}
      <View style={styles.grid}>

        {/* Sản phẩm */}
        <TouchableOpacity style={styles.card}>
          <Text style={styles.cardIcon}>🗃️</Text>
          <Text style={styles.cardText}>Sản phẩm</Text>
        </TouchableOpacity>

        {/* Tỉ lệ nhập xuất */}
        <TouchableOpacity style={styles.card}>
          <Text style={styles.cardIcon}>💿</Text>
          <Text style={styles.cardText}>Tỉ lệ nhập xuất</Text>
        </TouchableOpacity>

        {/* Nhập hàng */}
        <TouchableOpacity style={styles.card}>
          <Text style={styles.cardIcon}>📥</Text>
          <Text style={styles.cardText}>Nhập hàng</Text>
        </TouchableOpacity>

        {/* Xuất hàng */}
        <TouchableOpacity style={styles.card}>
          <Text style={styles.cardIcon}>📤</Text>
          <Text style={styles.cardText}>Xuất hàng</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ddd",
  },

  header: {
    height: 90,
    backgroundColor: "#4A90E2",
    justifyContent: "center",
    alignItems: "center",
  },

  headerText: {
    fontSize: 34,
    color: "#fff",
    fontWeight: "bold",
  },

  searchContainer: {
    height: 75,
    backgroundColor: "#e5e5e5",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  searchIcon: {
    fontSize: 28,
    marginRight: 10,
  },

  searchInput: {
    flex: 1,
    fontSize: 22,
    color: "#000",
  },

  menuBar: {
    height: 80,
    backgroundColor: "#cfc8c8",
    justifyContent: "center",
    paddingHorizontal: 25,
  },

  menuText: {
    fontSize: 24,
    fontWeight: "bold",
  },

  grid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-evenly",
    paddingTop: 25,
  },

  card: {
    width: 145,
    height: 145,
    backgroundColor: "#cfcfcf",
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  cardIcon: {
    fontSize: 80,
  },

  cardText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "500",
  },

  footer: {
    height: 85,
    backgroundColor: "#cfc8c8",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },

  footerIcon: {
    fontSize: 42,
  },
});