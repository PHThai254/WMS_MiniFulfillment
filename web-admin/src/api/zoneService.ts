import apiClient from './client';
import API_ENDPOINTS from './endpoints';
import type { ApiResponse } from '../types/api';

export interface ZoneDto {
  id: string;          // Guid
  warehouseId: string; // Guid
  name: string;
  capacity?: number;
}

/**
 * Zone Service
 */
class ZoneService {
  async getZones(): Promise<{ data: ZoneDto[] }> {
    const response = await apiClient.get<ApiResponse<ZoneDto[]>>(
      API_ENDPOINTS.zones.list
    );
    return {
      data: response.data.data || []
    };
  }

  async getZoneById(id: string): Promise<ZoneDto> {
    const response = await apiClient.get<ApiResponse<ZoneDto>>(
      API_ENDPOINTS.zones.get(id)
    );
    return (response.data.data ?? { id: '', warehouseId: '', name: '' }) as ZoneDto;
  }

  async getZonesByWarehouse(warehouseId: string): Promise<{ data: ZoneDto[] }> {
    const response = await apiClient.get<ApiResponse<ZoneDto[]>>(
      `${API_ENDPOINTS.zones.list}?warehouseId=${warehouseId}`
    );
    return {
      data: response.data.data || []
    };
  }
}

export default new ZoneService();
