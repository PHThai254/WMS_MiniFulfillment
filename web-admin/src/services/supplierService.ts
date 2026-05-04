import apiClient from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import type { ApiResponse } from '../types/api';
import type { ISupplier } from '../types/domain';

export const supplierService = {
    list: async () => apiClient.get(API_ENDPOINTS.suppliers.list) as Promise<ApiResponse<ISupplier[]>>,
    get: async (id: string) => apiClient.get(API_ENDPOINTS.suppliers.get(id)) as Promise<ApiResponse<ISupplier>>,
    create: async (data: { name: string; contactPerson?: string; phone?: string; address?: string }) =>
        apiClient.post(API_ENDPOINTS.suppliers.create, data) as Promise<ApiResponse<ISupplier>>,
    update: async (id: string, data: { name: string; contactPerson?: string; phone?: string; address?: string }) =>
        apiClient.put(API_ENDPOINTS.suppliers.update(id), data) as Promise<ApiResponse<ISupplier>>,
    delete: async (id: string) => apiClient.delete(API_ENDPOINTS.suppliers.delete(id)) as Promise<ApiResponse<null>>,
};
