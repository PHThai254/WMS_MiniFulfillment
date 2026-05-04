import apiClient from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import type { ApiResponse } from '../types/api';
import type { IWarehouse } from '../types/domain';

let warehouseCache: ApiResponse<IWarehouse[]> | null = null;

export const warehouseService = {
    list: async (forceRefresh = false) => {
        if (!forceRefresh && warehouseCache) return warehouseCache;
        const res = await apiClient.get(API_ENDPOINTS.warehouses.list) as ApiResponse<IWarehouse[]>;
        if (res.success) warehouseCache = res;
        return res;
    },
    get: async (id: string) => apiClient.get(API_ENDPOINTS.warehouses.get(id)) as Promise<ApiResponse<IWarehouse>>,
    create: async (data: { name: string; location: string }) => {
        warehouseCache = null;
        return apiClient.post(API_ENDPOINTS.warehouses.create, data) as Promise<ApiResponse<IWarehouse>>;
    },
    update: async (id: string, data: { name: string; location: string }) => {
        warehouseCache = null;
        return apiClient.put(API_ENDPOINTS.warehouses.update(id), data) as Promise<ApiResponse<IWarehouse>>;
    },
    delete: async (id: string) => {
        warehouseCache = null;
        return apiClient.delete(API_ENDPOINTS.warehouses.delete(id)) as Promise<ApiResponse<null>>;
    },
};
