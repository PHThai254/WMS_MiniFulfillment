// mobile-app/src/components/ScannerHeader.tsx (Updated)
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

interface ScannerHeaderProps {
  title: string;
  subtitle?: string;
  isError?: boolean;
  isSuccess?: boolean;
}

export const ScannerHeader: React.FC<ScannerHeaderProps> = ({
  title,
  subtitle,
  isError = false,
  isSuccess = false,
}) => {
  const getBackgroundColor = () => {
    if (isError) return '#ffebee'; // Red
    if (isSuccess) return '#e8f5e9'; // Green
    return '#f5f5f5'; // Default gray
  };

  const getTextColor = () => {
    if (isError) return '#d32f2f'; // Dark red
    if (isSuccess) return '#2e7d32'; // Dark green
    return '#333'; // Dark gray
  };

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor() }]}>
      <Text style={[styles.title, { color: getTextColor() }]}>
        {title}
      </Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: getTextColor() }]}>
          {subtitle}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderRadius: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
});