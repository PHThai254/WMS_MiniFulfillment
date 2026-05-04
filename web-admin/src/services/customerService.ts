import apiClient from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import type { ApiResponse } from '../types/api';
import type { ICustomer } from '../types/domain';

export const customerService = {
    list: async () => apiClient.get(API_ENDPOINTS.customers.list) as Promise<ApiResponse<ICustomer[]>>,
    get: async (id: string) => apiClient.get(API_ENDPOINTS.customers.get(id)) as Promise<ApiResponse<ICustomer>>,
    create: async (data: { name: string; phone?: string; deliveryAddress?: string }) =>
        apiClient.post(API_ENDPOINTS.customers.create, data) as Promise<ApiResponse<ICustomer>>,
    update: async (id: string, data: { name: string; phone?: string; deliveryAddress?: string }) =>
        apiClient.put(API_ENDPOINTS.customers.update(id), data) as Promise<ApiResponse<ICustomer>>,
    delete: async (id: string) => apiClient.delete(API_ENDPOINTS.customers.delete(id)) as Promise<ApiResponse<null>>,
};
