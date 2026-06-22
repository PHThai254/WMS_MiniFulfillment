import apiClient from './client';
import API_ENDPOINTS from './endpoints';
import type { ApiResponse } from '../types/api';

export interface SupplierDto {
  id: string; // Guid
  name: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
}

/**
 * Supplier Service
 */
class SupplierService {
  async getSuppliers(): Promise<{ data: SupplierDto[] }> {
    const response = await apiClient.get<ApiResponse<SupplierDto[]>>(
      API_ENDPOINTS.suppliers.list
    );
    return {
      data: response.data.data || []
    };
  }

  async getSupplierById(id: string): Promise<SupplierDto> {
    const response = await apiClient.get<ApiResponse<SupplierDto>>(
      API_ENDPOINTS.suppliers.get(id)
    );
    return (response.data.data ?? { id: '', name: '' }) as SupplierDto;
  }
}

export default new SupplierService();
