// mobile-app/src/components/PrimaryButton.tsx
import React from 'react';
import { StyleSheet } from 'react-native';
import { Button, ButtonProps } from 'react-native-paper';
import * as Haptics from 'expo-haptics';

interface PrimaryButtonProps extends ButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  children,
  onPress,
  loading = false,
  disabled = false,
  ...props
}) => {
  const handlePress = () => {
    // Rung nhẹ khi bấm nút
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <Button
      mode="contained"
      onPress={handlePress}
      loading={loading}
      disabled={disabled || loading}
      contentStyle={styles.buttonContent}
      labelStyle={styles.buttonLabel}
      style={styles.button}
      {...props}
    >
      {children}
    </Button>
  );
};

const styles = StyleSheet.create({
  button: {
    marginTop: 24,
    borderRadius: 8,
  },
  buttonContent: {
    height: 56, // Size to fit a finger tap
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});
