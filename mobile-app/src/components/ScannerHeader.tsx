// mobile-app/src/components/ScannerHeader.tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

interface ScannerHeaderProps {
  title: string;
  subtitle?: string;
  isError?: boolean;
}

export const ScannerHeader: React.FC<ScannerHeaderProps> = ({ title, subtitle, isError }) => {
  return (
    <View style={[styles.container, isError && styles.errorContainer]}>
      <Text style={[styles.title, isError && styles.errorText]}>{title}</Text>
      {subtitle && <Text style={[styles.subtitle, isError && styles.errorText]}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    marginBottom: 16,
  },
  errorContainer: {
    backgroundColor: '#ffebee', // Nền đỏ nhạt khi lỗi
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase', // Ép viết hoa toàn bộ
  },
  errorText: {
    color: '#d32f2f', // Chữ đỏ khi lỗi
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
});