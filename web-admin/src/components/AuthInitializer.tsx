import React, { useEffect } from 'react';
import { Spin } from 'antd';
import { useAuthStore } from '../stores/authStore';

interface AuthInitializerProps {
    children: React.ReactNode;
}

export const AuthInitializer: React.FC<AuthInitializerProps> = ({ children }) => {
    const initialize = useAuthStore((state) => state.initialize);
    const isLoading = useAuthStore((state) => state.isLoading);

    useEffect(() => {
        void initialize();
    }, [initialize]);

    if (isLoading) {
        return <Spin fullscreen />;
    }

    return <>{children}</>;
};
