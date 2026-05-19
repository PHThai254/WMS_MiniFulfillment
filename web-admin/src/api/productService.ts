import apiClient from './client';
import API_ENDPOINTS from './endpoints';
import type { ApiResponse, PaginatedApiResponse } from '../types/api';

export interface ProductDto {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  categoryId: number;
}

/**
 * Product Service
 */
class ProductService {
  async getProducts(): Promise<{ data: ProductDto[] }> {
    const response = await apiClient.get<ApiResponse<ProductDto[]>>(
      API_ENDPOINTS.products.list
    );
    return {
      data: response.data.data || []
    };
  }

  async getProductById(id: number): Promise<ProductDto> {
    const response = await apiClient.get<ApiResponse<ProductDto>>(
      API_ENDPOINTS.products.get(id.toString())
    );
    return response.data.data || {};
  }
}

export default new ProductService();
