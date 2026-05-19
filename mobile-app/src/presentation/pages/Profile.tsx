import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { useAuth } from "../context/AuthContext";

export const ProfileScreen = ({ navigation }: any) => {
    const { user } = useAuth() as any;

    return (
        <View style={styles.container}>

            {/* HEADER */}
            <View style={styles.header}>
                <Text style={styles.headerText}>Profile</Text>
            </View>

            {/* CONTENT */}
            <View style={styles.content}>
                {/* Render dữ liệu thật chuẩn khớp với Backend WMS */}
                <Text style={styles.text}>Tài khoản: {user?.username || "Đang tải..."}</Text>
                <Text style={styles.text}>Chức vụ: {user?.role || "Chưa rõ"}</Text>
                <Text style={styles.text}>Kho làm việc: {user?.warehouseName || "Chưa phân bổ"}</Text>
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
    // Thêm style cho text để chữ to rõ ràng, chuyên nghiệp hơn
    text: {
        fontSize: 18,
        marginVertical: 8,
        color: "#333",
    }
});