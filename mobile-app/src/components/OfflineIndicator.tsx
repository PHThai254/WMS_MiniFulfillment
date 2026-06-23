/**
 * Offline Indicator Component
 * Hiển thị trạng thái kết nối và số lượng hành động offline đang chờ
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useOfflineQueue } from '../context/OfflineQueueContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const OfflineIndicator: React.FC = () => {
  const { isOnline, pendingActions, processPending } = useOfflineQueue();

  if (isOnline && pendingActions.length === 0) {
    return null; // Không hiển thị nếu online và không có pending actions
  }

  const handleRetry = async () => {
    try {
      const remaining = await processPending();
      if (remaining === 0) {
        Alert.alert('✅ Thành Công', 'Tất cả dữ liệu đã được đồng bộ');
      }
    } catch (error) {
      console.error('❌ Lỗi retry:', error);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        !isOnline ? styles.offline : styles.pending,
      ]}
      onPress={handleRetry}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons
        name={isOnline ? 'cloud-check' : 'cloud-offline'}
        size={16}
        color="#fff"
        style={styles.icon}
      />

      <Text style={styles.text}>
        {!isOnline
          ? '📵 Offline'
          : `⏳ ${pendingActions.length} chờ đồng bộ`}
      </Text>

      {pendingActions.length > 0 && (
        <Text style={styles.retry}>Bấm để thử lại</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },

  offline: {
    backgroundColor: '#d32f2f',
  },

  pending: {
    backgroundColor: '#FF9800',
  },

  icon: {
    marginRight: 4,
  },

  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },

  retry: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontStyle: 'italic',
  },
});
