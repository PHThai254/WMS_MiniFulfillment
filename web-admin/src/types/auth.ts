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
    role: 'Admin' | 'QA_QC' | 'Staff' | 'Manager';
    warehouseId?: string | null;
    warehouseName?: string;
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
}
