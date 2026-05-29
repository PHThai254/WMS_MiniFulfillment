import apiClient from './client';
import API_ENDPOINTS from './endpoints';
import type { ApiResponse } from '../types/api';

export interface ZoneDto {
  id: number;
  warehouseId: number;
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

  async getZoneById(id: number): Promise<ZoneDto> {
    const response = await apiClient.get<ApiResponse<ZoneDto>>(
      API_ENDPOINTS.zones.get(id.toString())
    );
    return (response.data.data ?? { id: 0, warehouseId: 0, name: '' }) as ZoneDto;
  }

  async getZonesByWarehouse(warehouseId: number): Promise<{ data: ZoneDto[] }> {
    const response = await apiClient.get<ApiResponse<ZoneDto[]>>(
      `${API_ENDPOINTS.zones.list}?warehouseId=${warehouseId}`
    );
    return {
      data: response.data.data || []
    };
  }
}

export default new ZoneService();
