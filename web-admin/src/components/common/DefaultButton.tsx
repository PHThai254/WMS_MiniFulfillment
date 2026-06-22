import React from 'react';
import { Button, type ButtonProps } from 'antd';

// Kế thừa toàn bộ thuộc tính gốc của Ant Design Button
export const DefaultButton: React.FC<ButtonProps> = (props) => {
  return (
    <Button 
      type="default" 
      {...props} 
    >
      {props.children}
    </Button>
  );
};