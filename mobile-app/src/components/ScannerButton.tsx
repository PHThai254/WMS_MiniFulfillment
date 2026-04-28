// mobile-app/src/components/ScannerButton.tsx (Updated)
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
  size?: 'small' | 'medium' | 'large';
}

export const ScannerButton: React.FC<ScannerButtonProps> = ({
  mode = 'contained',
  onPress,
  children,
  loading = false,
  disabled = false,
  size = 'large',
  style,
  ...props
}) => {
  const handlePress = async () => {
    try {
      // Haptic feedback khi bấm
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress();
    } catch (error) {
      console.error('❌ Error in ScannerButton press:', error);
    }
  };

  const sizeStyles = {
    small: styles.buttonSmall,
    medium: styles.buttonMedium,
    large: styles.buttonLarge,
  };

  return (
    <Button
      mode={mode}
      onPress={handlePress}
      loading={loading}
      disabled={disabled || loading}
      contentStyle={[styles.buttonContent, sizeStyles[size]]}
      labelStyle={styles.buttonLabel}
      style={[styles.button, style]}
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
    paddingVertical: 8,
  },
  buttonSmall: {
    height: 40,
  },
  buttonMedium: {
    height: 48,
  },
  buttonLarge: {
    height: 56,
  },
  buttonLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});