import apiClient from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import type { ApiResponse } from '../types/api';
import type { ICategory } from '../types/domain';

let categoryCache: ApiResponse<ICategory[]> | null = null;

export const categoryService = {
    list: async (forceRefresh = false) => {
        if (!forceRefresh && categoryCache) return categoryCache;
        const res = await apiClient.get(API_ENDPOINTS.categories.list) as ApiResponse<ICategory[]>;
        if (res.success) categoryCache = res;
        return res;
    },
    get: async (id: string) => apiClient.get(API_ENDPOINTS.categories.get(id)) as Promise<ApiResponse<ICategory>>,
    create: async (data: { name: string }) => {
        categoryCache = null;
        return apiClient.post(API_ENDPOINTS.categories.create, data) as Promise<ApiResponse<ICategory>>;
    },
    update: async (id: string, data: { name: string }) => {
        categoryCache = null;
        return apiClient.put(API_ENDPOINTS.categories.update(id), data) as Promise<ApiResponse<ICategory>>;
    },
    delete: async (id: string) => {
        categoryCache = null;
        return apiClient.delete(API_ENDPOINTS.categories.delete(id)) as Promise<ApiResponse<null>>;
    },
};
