// API Response Wrapper Type
export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    errors?: string[];
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    skip: number;
    take: number;
}

export interface PaginatedApiResponse<T> extends ApiResponse<PaginatedResponse<T>> { }
