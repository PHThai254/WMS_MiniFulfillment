import React, { createContext, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

interface AuthContextType {
    isLoading: boolean;
    isSignout: boolean;
    isSignedIn: boolean;
    user: any | null; // Khai báo biến lưu thông tin user
    signIn: (userData: any) => Promise<void>; // Cho phép truyền data vào khi đăng nhập
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = React.useReducer(
        (prevState: any, action: any) => {
            switch (action.type) {
                case 'RESTORE_TOKEN':
                    return {
                        ...prevState,
                        isLoading: false,
                        isSignout: false,
                        isSignedIn: action.payload.isSignedIn,
                        user: action.payload.user, // Phục hồi lại user
                    };
                case 'SIGN_IN':
                    return {
                        ...prevState,
                        isSignout: false,
                        isSignedIn: true,
                        user: action.payload.user, // Lưu user vào kho
                    };
                case 'SIGN_OUT':
                    return {
                        ...prevState,
                        isSignout: true,
                        isSignedIn: false,
                        user: null, // Xóa user khi đăng xuất
                    };
            }
        },
        {
            isLoading: true,
            isSignout: true,
            isSignedIn: false,
            user: null,
        }
    );

    useEffect(() => {
        const bootstrapAsync = async () => {
            try {
                const accessToken = await SecureStore.getItemAsync('accessToken');
                const refreshToken = await SecureStore.getItemAsync('refreshToken');
                // Đọc thêm thông tin user đã lưu
                const savedUser = await SecureStore.getItemAsync('userData');

                if (accessToken && refreshToken && savedUser) {
                    dispatch({
                        type: 'RESTORE_TOKEN',
                        payload: { isSignedIn: true, user: JSON.parse(savedUser) }
                    });
                    console.log('🔓 Khôi phục session từ SecureStore');
                } else {
                    dispatch({ type: 'RESTORE_TOKEN', payload: { isSignedIn: false, user: null } });
                }
            } catch (e) {
                dispatch({ type: 'RESTORE_TOKEN', payload: { isSignedIn: false, user: null } });
            }
        };

        bootstrapAsync();
    }, []);

    const authContext = {
        isLoading: state.isLoading,
        isSignout: state.isSignout,
        isSignedIn: state.isSignedIn,
        user: state.user, // Xuất biến user ra cho các màn hình khác dùng
        signIn: async (userData: any) => {
            // Lưu tạm thông tin user vào máy để lần sau mở app không bị mất
            await SecureStore.setItemAsync('userData', JSON.stringify(userData));
            dispatch({ type: 'SIGN_IN', payload: { user: userData } });
        },
        signOut: async () => {
            try {
                await SecureStore.deleteItemAsync('accessToken');
                await SecureStore.deleteItemAsync('refreshToken');
                await SecureStore.deleteItemAsync('userData'); // Xóa sạch dữ liệu
                dispatch({ type: 'SIGN_OUT' });
            } catch (e) {
                console.error('❌ Lỗi khi đăng xuất:', e);
            }
        },
    };

    return (
        <AuthContext.Provider value={authContext}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};