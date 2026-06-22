import apiClient from './client';
import API_ENDPOINTS from './endpoints';
import type { ApiResponse } from '../types/api';

export interface ProductDto {
  id: string;       // Guid
  name: string;
  sku: string;
  barcode: string;
  categoryId: string; // Guid
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

  async getProductById(id: string): Promise<ProductDto> {
    const response = await apiClient.get<ApiResponse<ProductDto>>(
      API_ENDPOINTS.products.get(id)
    );
    return (response.data.data ?? { id: '', name: '', sku: '', barcode: '', categoryId: '' }) as ProductDto;
  }
}

export default new ProductService();
