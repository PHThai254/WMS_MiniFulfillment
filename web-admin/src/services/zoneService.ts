import apiClient from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import type { ApiResponse } from '../types/api';
import type { IZone } from '../types/domain';

const zoneCache: Record<string, ApiResponse<IZone[]>> = {};

export const zoneService = {
    list: async (warehouseId?: string, forceRefresh = false) => {
        const cacheKey = warehouseId || 'all';
        if (!forceRefresh && zoneCache[cacheKey]) return zoneCache[cacheKey];
        
        const url = warehouseId ? `${API_ENDPOINTS.zones.list}?warehouseId=${warehouseId}` : API_ENDPOINTS.zones.list;
        const res = await apiClient.get(url) as ApiResponse<IZone[]>;
        if (res.success) zoneCache[cacheKey] = res;
        return res;
    },
    get: async (id: string) => apiClient.get(API_ENDPOINTS.zones.get(id)) as Promise<ApiResponse<IZone>>,
    create: async (data: { warehouseId: string; name: string }) => {
        for (const key in zoneCache) delete zoneCache[key];
        return apiClient.post(API_ENDPOINTS.zones.create, data) as Promise<ApiResponse<IZone>>;
    },
    update: async (id: string, data: { name: string }) => {
        for (const key in zoneCache) delete zoneCache[key];
        return apiClient.put(API_ENDPOINTS.zones.update(id), data) as Promise<ApiResponse<IZone>>;
    },
    delete: async (id: string) => {
        for (const key in zoneCache) delete zoneCache[key];
        return apiClient.delete(API_ENDPOINTS.zones.delete(id)) as Promise<ApiResponse<null>>;
    },
};
