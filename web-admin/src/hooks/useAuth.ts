import { useAuthStore } from '../stores/authStore';
import type { AuthContextType } from '../types/auth';

export const useAuth = (): AuthContextType => {
    const user = useAuthStore((state) => state.user);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isLoading = useAuthStore((state) => state.isLoading);
    const login = useAuthStore((state) => state.login);
    const logout = useAuthStore((state) => state.logout);
    const refreshToken = useAuthStore((state) => state.refreshToken);
    const hasRole = useAuthStore((state) => state.hasRole);
    const canAccessWarehouse = useAuthStore((state) => state.canAccessWarehouse);

    return {
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
        refreshToken,
        hasRole,
        canAccessWarehouse,
    };
};
