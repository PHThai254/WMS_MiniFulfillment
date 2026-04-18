// src/components/PrimaryButton.tsx
import { Button, type ButtonProps } from 'antd';

// Kế thừa toàn bộ thuộc tính của AntD Button, nhưng ghi đè các style mặc định
export const PrimaryButton: React.FC<ButtonProps> = ({ children, style, ...props }) => {
  return (
    <Button
      type="primary"
      size="large"
      style={{
        borderRadius: '6px', // Ép bo góc chuẩn
        fontWeight: 500,     // Ép font chữ đậm nhẹ
        ...style,            // Cho phép component cha thêm style nếu cần
      }}
      {...props}
    >
      {children}
    </Button>
  );
};