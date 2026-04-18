// mobile-app/src/components/ScannerButton.tsx
import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Button } from 'react-native-paper';
import * as Haptics from 'expo-haptics';

interface ScannerButtonProps {
  mode?: 'text' | 'outlined' | 'contained';
  onPress: () => void;
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export const ScannerButton: React.FC<ScannerButtonProps> = ({
  mode = 'contained',
  onPress,
  children,
  ...props
}) => {
  const handlePress = () => {
    // Luôn rung nhẹ khi bấm để tăng UX cho màn hình cảm ứng
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Button
      mode={mode}
      onPress={handlePress}
      contentStyle={styles.buttonContent}
      labelStyle={styles.buttonLabel}
      style={[styles.button, props.style]}
      {...props}
    >
      {children}
    </Button>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    marginVertical: 10,
  },
  buttonContent: {
    height: 56, // Ép chiều cao tối thiểu 56px chuẩn ngón tay
  },
  buttonLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});