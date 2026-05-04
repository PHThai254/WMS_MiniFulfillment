import React from 'react';
import { Button } from 'antd';
import type { ButtonProps } from 'antd';

export interface PrimaryButtonProps extends ButtonProps {
    children: React.ReactNode;
}

/**
 * PrimaryButton - Base component for all buttons in the application
 * MANDATORY: Use this component instead of direct Ant Design Button
 */
export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
    children,
    type = 'primary',
    ...props
}) => {
    return (
        <Button
            type={type}
            {...props}
        >
            {children}
        </Button>
    );
};
