// mobile-app/src/presentation/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

interface AuthContextType {
  isLoading: boolean;
  isSignout: boolean;
  isSignedIn: boolean;
  signIn: () => Promise<void>;
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
          };
        case 'SIGN_IN':
          return {
            ...prevState,
            isSignout: false,
            isSignedIn: true,
          };
        case 'SIGN_OUT':
          return {
            ...prevState,
            isSignout: true,
            isSignedIn: false,
          };
      }
    },
    {
      isLoading: true,
      isSignout: true,
      isSignedIn: false,
    }
  );

  // On app launch, check if we have tokens
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const accessToken = await SecureStore.getItemAsync('accessToken');
        const refreshToken = await SecureStore.getItemAsync('refreshToken');

        if (accessToken && refreshToken) {
          dispatch({ type: 'RESTORE_TOKEN', payload: { isSignedIn: true } });
          console.log('🔓 Khôi phục session từ SecureStore');
        } else {
          dispatch({ type: 'RESTORE_TOKEN', payload: { isSignedIn: false } });
          console.log('🔒 Không có token, cần đăng nhập');
        }
      } catch (e) {
        console.error('❌ Lỗi khi khôi phục token:', e);
        dispatch({ type: 'RESTORE_TOKEN', payload: { isSignedIn: false } });
      }
    };

    bootstrapAsync();
  }, []);

  const authContext = {
    isLoading: state.isLoading,
    isSignout: state.isSignout,
    isSignedIn: state.isSignedIn,
    signIn: async () => {
      dispatch({ type: 'SIGN_IN' });
    },
    signOut: async () => {
      try {
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        dispatch({ type: 'SIGN_OUT' });
        console.log('✅ Đã đăng xuất');
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
