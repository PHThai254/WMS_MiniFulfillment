// mobile-app/src/components/LoginInput.tsx
import React from 'react';
import { StyleSheet } from 'react-native';
import { TextInput, TextInputProps } from 'react-native-paper';

interface LoginInputProps extends TextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  placeholder?: string;
}

export const LoginInput: React.FC<LoginInputProps> = ({
  label,
  value,
  onChangeText,
  secureTextEntry = false,
  placeholder,
  ...props
}) => {
  return (
    <TextInput
      label={label}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      placeholder={placeholder}
      mode="outlined"
      style={styles.input}
      contentStyle={styles.inputContent}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    marginBottom: 16,
    fontSize: 16,
  },
  inputContent: {
    minHeight: 50,
    fontSize: 16,
  },
});
