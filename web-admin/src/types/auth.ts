// Auth DTOs & Interfaces
export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    user?: IUser;
}

export interface RefreshTokenRequest {
    accessToken: string;
    refreshToken: string;
}

export interface RefreshTokenResponse {
    accessToken: string;
    refreshToken: string;
}

export interface IUser {
    id: string;
    username: string;
    role: 'Admin' | 'QA_QC' | 'Staff';
    warehouseId?: string | null;
    warehouseName?: string;
    // FIX BUG 3: Mảng quyền động từ DB thay vì hardcode Role
    permissions: string[];
}

export interface AuthContextType {
    user: IUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
    refreshToken: () => Promise<boolean>;
    hasRole: (role: string) => boolean;
    canAccessWarehouse: (warehouseId: string) => boolean;
    // FIX BUG 3: Helper kiểm tra quyền động
    hasPermission: (permission: string) => boolean;
}
