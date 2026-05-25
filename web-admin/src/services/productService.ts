import apiClient from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import type { ApiResponse } from '../types/api';
import type { IProduct } from '../types/domain';

export const productService = {
    list: async (search?: string, categoryId?: string) => {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (categoryId) params.append('categoryId', categoryId);
        return apiClient.get(`${API_ENDPOINTS.products.list}?${params}`) as Promise<ApiResponse<IProduct[]>>;
    },
    get: async (id: string) => apiClient.get(API_ENDPOINTS.products.get(id)) as Promise<ApiResponse<IProduct>>,
    getByBarcode: async (barcode: string) => apiClient.get(API_ENDPOINTS.products.byBarcode(barcode)) as Promise<ApiResponse<IProduct>>,
    
    // BỔ SUNG THÊM price VÀO PAYLOAD CREATE & UPDATE
    create: async (data: { name: string; sku: string; categoryId: string; price: number }) =>
        apiClient.post(API_ENDPOINTS.products.create, data) as Promise<ApiResponse<IProduct>>,
    update: async (id: string, data: { name: string; sku: string; categoryId: string; price: number }) =>
        apiClient.put(API_ENDPOINTS.products.update(id), data) as Promise<ApiResponse<IProduct>>,
    
    delete: async (id: string) => apiClient.delete(API_ENDPOINTS.products.delete(id)) as Promise<ApiResponse<null>>,
};