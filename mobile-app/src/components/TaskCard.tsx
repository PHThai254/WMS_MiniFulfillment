// mobile-app/src/components/TaskCard.tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';

interface TaskCardProps {
  taskId: string;
  taskType: 'Nhập Kho' | 'Xuất Kho';
  quantity: number;
  onPress: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ taskId, taskType, quantity, onPress }) => {
  const theme = useTheme();
  const isImport = taskType === 'Nhập Kho';

  return (
    <Card style={styles.card} onPress={onPress}>
      <Card.Content>
        <View style={styles.row}>
          <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
            {taskId}
          </Text>
          <Text
            variant="labelLarge"
            style={{ color: isImport ? theme.colors.primary : theme.colors.error }}
          >
            {taskType}
          </Text>
        </View>
        <View style={[styles.row, { marginTop: 8 }]}>
          <Text variant="bodyMedium">Số lượng mặt hàng:</Text>
          <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>
            {quantity}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    elevation: 2, // Tạo bóng đổ nhẹ
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});