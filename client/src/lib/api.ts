// API client for farmOS backend

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005';

export interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    per_page?: number;
  };
  links?: {
    self?: string;
    first?: string;
    last?: string;
    next?: string;
    prev?: string;
  };
}

export interface Asset {
  id: string;
  type: string;
  attributes: {
    name: string;
    status: string;
    notes?: string;
    quantity?: number; // Number of items in this asset (flock size, bed count, etc.)
    is_location: boolean;
    is_fixed: boolean;
    created_at: string;
    updated_at: string;
    archived_at?: string | null;
    asset_type: string;
    current_location_id?: number | null;
    // Geometry field for land assets/locations
    geometry?: {
      type: 'Polygon' | 'Point' | 'LineString';
      coordinates: any;
    } | null;
    // Hierarchy fields
    parent_id?: number | null;
    depth?: number;
    is_root?: boolean;
    is_leaf?: boolean;
    child_count?: number;
  };
  relationships?: {
    current_location?: {
      data: { id: string; type: string } | null;
    };
    parent?: {
      data: { id: string; type: string } | null;
    };
    children?: {
      data: Array<{ id: string; type: string }>;
    };
  };
  links?: {
    self: string;
  };
}

export interface Quantity {
  id: string;
  type: 'quantity';
  attributes: {
    value: number;
    unit: string;
    quantity_type?: string;
  };
}

export interface Log {
  id: string;
  type: string;
  attributes: {
    name: string;
    status: string;
    notes?: string;
    timestamp: string;
    created_at: string;
    updated_at: string;
    log_type: string;
    to_location_id?: number | null;
    from_location_id?: number | null;
  };
  relationships?: {
    asset?: {
      data: Array<{ id: string; type: string }>;
    };
    source_assets?: {
      data: Array<{ id: string; type: string }>;
    };
    output_assets?: {
      data: Array<{ id: string; type: string }>;
    };
    location?: {
      data: Array<{ id: string; type: string }>;
    };
    quantities?: {
      data: Array<{ id: string; type: string }>;
    };
  };
  links?: {
    self: string;
  };
}

// Geometry types for farmAPI format
export interface PointGeometry {
  latitude: number;
  longitude: number;
}

export interface PolygonGeometry extends Array<PointGeometry> {}

// Location interface matching farmAPI specification
export interface Location {
  id: string;
  type: 'location';
  attributes: {
    name: string;
    location_type: 'point' | 'polygon';
    geometry: PointGeometry | PolygonGeometry;
    status?: string | null;
    notes?: string | null;
    archived_at?: string | null;
    created_at: string;
    updated_at: string;
    center_point?: PointGeometry;
    area_in_acres?: number | null;
    asset_count?: number;
    total_asset_count?: number;
    // Hierarchy fields
    parent_id?: number | null;
    depth?: number;
    is_root?: boolean;
    is_leaf?: boolean;
    child_count?: number;
  };
  relationships?: {
    assets?: { data: Array<{ id: string; type: string }> };
    incoming_movements?: { data: Array<{ id: string; type: string }> };
    outgoing_movements?: { data: Array<{ id: string; type: string }> };
    parent?: { data: { id: string; type: string } | null };
    children?: { data: Array<{ id: string; type: string }> };
  };
}

// ===========================
// Geometry Conversion Utilities
// ===========================

/**
 * Convert GeoJSON format to farmAPI format
 * GeoJSON uses [longitude, latitude] in coordinates array
 * farmAPI uses array of {latitude, longitude} objects
 */
export function convertGeoJsonToFarmApi(geoJson: any): PointGeometry | PolygonGeometry {
  if (geoJson.type === 'Point') {
    return {
      latitude: geoJson.coordinates[1],
      longitude: geoJson.coordinates[0]
    };
  }
  
  if (geoJson.type === 'Polygon') {
    // Take first ring (exterior ring)
    return geoJson.coordinates[0].map(([lng, lat]: [number, number]) => ({
      latitude: lat,
      longitude: lng
    }));
  }
  
  throw new Error(`Unsupported geometry type: ${geoJson.type}`);
}

/**
 * Convert farmAPI format to GeoJSON format for map rendering
 * farmAPI uses array of {latitude, longitude} objects or single point object
 * GeoJSON uses [longitude, latitude] in coordinates array
 */
export function convertFarmApiToGeoJson(location: Location): GeoJSON.Feature {
  const attrs = location.attributes;

  // Handle locations with null geometry
  if (!attrs.geometry) {
    return {
      type: 'Feature',
      geometry: null as any,
      properties: {
        id: location.id,
        name: attrs.name,
        notes: attrs.notes,
        status: attrs.status,
        area_acres: attrs.area_in_acres,
        asset_count: attrs.asset_count,
        ...attrs
      }
    };
  }

  if (attrs.location_type === 'point') {
    const point = attrs.geometry as PointGeometry;
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [point.longitude, point.latitude]
      },
      properties: {
        id: location.id,
        name: attrs.name,
        notes: attrs.notes,
        status: attrs.status,
        area_acres: attrs.area_in_acres,
        asset_count: attrs.asset_count,
        ...attrs
      }
    };
  }

  if (attrs.location_type === 'polygon') {
    const polygon = attrs.geometry as PolygonGeometry;
    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          polygon.map(point => [point.longitude, point.latitude])
        ]
      },
      properties: {
        id: location.id,
        name: attrs.name,
        notes: attrs.notes,
        status: attrs.status,
        area_acres: attrs.area_in_acres,
        asset_count: attrs.asset_count,
        ...attrs
      }
    };
  }

  throw new Error(`Unsupported location type: ${attrs.location_type}`);
}

class ApiError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errorData;
      
      try {
        errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // If response is not JSON, use status text
      }

      throw new ApiError(response.status, errorMessage, errorData);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Network or other errors
    throw new ApiError(
      0,
      error instanceof Error ? error.message : 'Network error',
      error
    );
  }
}

// Assets API
export const assetsApi = {
  list: async (assetType: string, page = 1, perPage = 20, filters?: {
    root_only?: boolean;
    parent_id?: string | number;
    current_location_id?: string | number;
  }) => {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    });
    
    if (filters?.root_only) {
      params.append('filter[root_only]', 'true');
    }
    
    if (filters?.parent_id) {
      params.append('filter[parent_id]', filters.parent_id.toString());
    }
    
    if (filters?.current_location_id) {
      params.append('filter[current_location_id]', filters.current_location_id.toString());
    }
    
    return fetchApi<ApiResponse<Asset[]>>(
      `/api/v1/assets/${assetType}?${params.toString()}`
    );
  },

  get: async (assetType: string, id: string, include?: string[]) => {
    const params = new URLSearchParams();
    if (include && include.length > 0) {
      params.append('include', include.join(','));
    }
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<ApiResponse<Asset>>(
      `/api/v1/assets/${assetType}/${id}${query}`
    );
  },

  getRoots: async (assetType: string, page = 1, perPage = 20) => {
    return assetsApi.list(assetType, page, perPage, { root_only: true });
  },

  getChildren: async (assetType: string, parentId: string | number, page = 1, perPage = 20) => {
    return assetsApi.list(assetType, page, perPage, { parent_id: parentId });
  },

  create: async (assetType: string, data: Partial<Asset['attributes']>) => {
    return fetchApi<ApiResponse<Asset>>(
      `/api/v1/assets/${assetType}`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: data.name,
          status: data.status || 'active',
          notes: data.notes,
          ...data,
        }),
      }
    );
  },

  update: async (assetType: string, id: string, data: Partial<Asset['attributes']>) => {
    return fetchApi<ApiResponse<Asset>>(
      `/api/v1/assets/${assetType}/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  },

  delete: async (assetType: string, id: string) => {
    return fetchApi<void>(
      `/api/v1/assets/${assetType}/${id}`,
      {
        method: 'DELETE',
      }
    );
  },
};

// Logs API
export const logsApi = {
  list: async (logType: string, page = 1, perPage = 20) => {
    return fetchApi<ApiResponse<Log[]>>(
      `/api/v1/logs/${logType}?page=${page}&per_page=${perPage}`
    );
  },

  get: async (logType: string, id: string) => {
    return fetchApi<ApiResponse<Log>>(
      `/api/v1/logs/${logType}/${id}`
    );
  },

  create: async (logType: string, data: any) => {
    // For harvest logs, we need to send the full structure with log wrapper
    if (logType === 'harvest') {
      return fetchApi<ApiResponse<Log>>(
        `/api/v1/logs`,
        {
          method: 'POST',
          body: JSON.stringify({
            log: {
              log_type: 'harvest',
              name: data.name,
              status: data.status || 'pending',
              timestamp: data.timestamp || new Date().toISOString(),
              notes: data.notes,
              to_location_id: data.to_location_id,
              asset_ids: data.asset_ids,
              asset_roles: data.asset_roles,
              quantities_attributes: data.quantities_attributes,
            },
          }),
        }
      );
    }
    
    // For other log types, use the old format
    return fetchApi<ApiResponse<Log>>(
      `/api/v1/logs/${logType}`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: data.name,
          status: data.status || 'done',
          timestamp: data.timestamp || new Date().toISOString(),
          notes: data.notes,
          ...data,
        }),
      }
    );
  },
  
  complete: async (id: string) => {
    return fetchApi<ApiResponse<Log>>(
      `/api/v1/logs/${id}/complete`,
      {
        method: 'POST',
      }
    );
  },

  update: async (logType: string, id: string, data: Partial<Log['attributes']>) => {
    return fetchApi<ApiResponse<Log>>(
      `/api/v1/logs/${logType}/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  },

  delete: async (logType: string, id: string) => {
    return fetchApi<void>(
      `/api/v1/logs/${logType}/${id}`,
      {
        method: 'DELETE',
      }
    );
  },
};

// Locations API
export const locationsApi = {
  list: async (page = 1, perPage = 100, filters?: {
    root_only?: boolean;
    parent_id?: string | number;
  }) => {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    });
    
    if (filters?.root_only) {
      params.append('filter[root_only]', 'true');
    }
    
    if (filters?.parent_id) {
      params.append('filter[parent_id]', filters.parent_id.toString());
    }
    
    return fetchApi<ApiResponse<Location[]>>(
      `/api/v1/locations?${params.toString()}`
    );
  },

  get: async (id: string, include?: string[]) => {
    const params = new URLSearchParams();
    if (include && include.length > 0) {
      params.append('include', include.join(','));
    }
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<ApiResponse<Location>>(
      `/api/v1/locations/${id}${query}`
    );
  },

  getRoots: async (page = 1, perPage = 100) => {
    return locationsApi.list(page, perPage, { root_only: true });
  },

  getChildren: async (parentId: string | number, page = 1, perPage = 100) => {
    return locationsApi.list(page, perPage, { parent_id: parentId });
  },

  create: async (data: {
    name: string;
    location_type: 'point' | 'polygon';
    geometry: PointGeometry | PolygonGeometry;
    status?: string;
    notes?: string;
    parent_id?: number | null;
  }) => {
    return fetchApi<ApiResponse<Location>>(
      `/api/v1/locations`,
      {
        method: 'POST',
        body: JSON.stringify({
          data: {
            type: 'location',
            attributes: data
          }
        }),
      }
    );
  },

  update: async (id: string, data: {
    name?: string;
    location_type?: 'point' | 'polygon';
    geometry?: PointGeometry | PolygonGeometry;
    status?: string;
    notes?: string;
    parent_id?: number | null;
  }) => {
    return fetchApi<ApiResponse<Location>>(
      `/api/v1/locations/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          data: {
            attributes: data
          }
        }),
      }
    );
  },

  delete: async (id: string) => {
    return fetchApi<void>(
      `/api/v1/locations/${id}`,
      {
        method: 'DELETE',
      }
    );
  },
};

export { ApiError };

