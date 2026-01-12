// API client for farmOS backend

import type { ChatMessage } from '@/types/chat';

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
    // Log associations
    log_count?: number;
    recent_logs?: Array<{
      id: number;
      name: string;
      log_type: string;
      timestamp: string;
      status: string;
      to_location_id?: number | null;
    }>;
    // Back-references
    referencing_task_count?: number;
    referencing_plan_count?: number;
    referencing_tasks?: Array<{
      id: number;
      title: string;
      state: string;
      plan_id: number;
    }>;
    referencing_plans?: Array<{
      id: number;
      name: string;
      status: string;
    }>;
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
    logs?: {
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
    is_movement?: boolean;
    // Asset associations
    asset_count?: number;
    asset_details?: Array<{
      id: number;
      name: string;
      asset_type: string;
      status: string;
    }>;
    // Back-references
    referencing_task_count?: number;
    referencing_plan_count?: number;
  };
  relationships?: {
    asset?: {
      data: Array<{ id: string; type: string }>;
    };
    assets?: {
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
    is_root_location?: boolean; // The designated root location for map centering
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
// Task Management Types
// ===========================

export type TaskState = 'backlog' | 'todo' | 'in_progress' | 'done' | 'cancelled';
export type PlanStatus = 'planned' | 'active' | 'completed' | 'cancelled';
export type TaskRelationType = 'blocks' | 'related' | 'duplicate';

export interface Task {
  id: string;
  type: 'task';
  attributes: {
    title: string;
    description?: string | null;
    state: TaskState;
    estimate?: number | null; // in minutes
    estimate_display?: string | null; // e.g., "2h 30m"
    estimate_in_hours?: number | null;
    target_date?: string | null;
    parent_id?: number | null;
    plan_id: number; // Required - every task belongs to a plan
    cycle_id?: number | null;
    created_at: string;
    updated_at: string;
    // Computed fields
    depth?: number;
    is_root?: boolean;
    is_leaf?: boolean;
    child_count?: number;
    is_active?: boolean;
    is_completed?: boolean;
    is_blocked?: boolean;
    blocks_count?: number;
    blocked_by_count?: number;
  };
  relationships?: {
    parent?: { data: { id: string; type: string } | null };
    children?: { data: Array<{ id: string; type: string }> };
    plan?: { data: { id: string; type: string } };
    cycle?: { data: { id: string; type: string } | null };
    assets?: { data: Array<{ id: string; type: string }> };
    locations?: { data: Array<{ id: string; type: string }> };
    logs?: { data: Array<{ id: string; type: string }> };
    tags?: { data: Array<{ id: string; type: string }> };
  };
}

// Tags for organizing tasks
export interface Tag {
  id: string;
  type: 'tag';
  attributes: {
    name: string;
    color: string;
    description?: string | null;
    created_at: string;
    updated_at: string;
    task_count?: number;
  };
}

export interface Plan {
  id: string;
  type: 'plan';
  attributes: {
    name: string;
    description?: string | null;
    status: PlanStatus;
    start_date?: string | null;
    target_date?: string | null;
    parent_id?: number | null; // Plans can be nested
    created_at: string;
    updated_at: string;
    // Computed fields
    task_count?: number;
    completed_task_count?: number;
    active_task_count?: number;
    progress_percentage?: number;
    total_estimate?: number;
    total_estimate_display?: string;
    is_in_progress?: boolean;
    // Hierarchy fields
    depth?: number;
    is_root?: boolean;
    is_leaf?: boolean;
    child_count?: number;
    direct_task_count?: number;
  };
  relationships?: {
    tasks?: { data: Array<{ id: string; type: string }> };
    parent?: { data: { id: string; type: string } | null };
    children?: { data: Array<{ id: string; type: string }> };
  };
}

export interface Cycle {
  id: string;
  type: 'cycle';
  attributes: {
    name: string;
    start_date: string;
    end_date: string;
    created_at: string;
    updated_at: string;
    // Computed fields
    is_current?: boolean;
    is_past?: boolean;
    is_future?: boolean;
    days_remaining?: number;
    days_elapsed?: number;
    total_days?: number;
    progress_percentage?: number;
    task_count?: number;
    completed_task_count?: number;
    active_task_count?: number;
    task_completion_percentage?: number;
    total_estimate?: number;
    completed_estimate?: number;
  };
  relationships?: {
    tasks?: { data: Array<{ id: string; type: string }> };
  };
}

export interface TaskRelation {
  id: string;
  type: 'task_relation';
  attributes: {
    relation_type: TaskRelationType;
    source_task_id: number;
    target_task_id: number;
    created_at: string;
    updated_at: string;
  };
  relationships?: {
    source_task?: { data: { id: string; type: string } };
    target_task?: { data: { id: string; type: string } };
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
    return fetchApi<ApiResponse<Log>>(
      `/api/v1/logs/${logType}`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: data.name,
          status: data.status || 'done',
          timestamp: data.timestamp || new Date().toISOString(),
          notes: data.notes,
          location_id: data.location_id,
          asset_ids: data.asset_ids,
          quantities_attributes: data.quantities_attributes,
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

// ===========================
// Tasks API
// ===========================
export interface TaskFilters {
  state?: TaskState | TaskState[];
  plan_id?: number | string;
  cycle_id?: number | string;
  parent_id?: number | string;
  tag_id?: number | string;
  tag_name?: string;
  unscheduled?: boolean;
  active?: boolean;
  completed?: boolean;
  blocked?: boolean;
  overdue?: boolean;
}

export const tasksApi = {
  list: async (page = 1, perPage = 50, filters?: TaskFilters) => {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    });

    if (filters?.state) {
      if (Array.isArray(filters.state)) {
        filters.state.forEach(s => params.append('filter[state][]', s));
      } else {
        params.append('filter[state]', filters.state);
      }
    }
    if (filters?.plan_id) {
      params.append('filter[plan_id]', filters.plan_id.toString());
    }
    if (filters?.cycle_id) {
      params.append('filter[cycle_id]', filters.cycle_id.toString());
    }
    if (filters?.parent_id) {
      params.append('filter[parent_id]', filters.parent_id.toString());
    }
    if (filters?.unscheduled) {
      params.append('filter[unscheduled]', 'true');
    }
    if (filters?.active) {
      params.append('filter[active]', 'true');
    }
    if (filters?.completed) {
      params.append('filter[completed]', 'true');
    }
    if (filters?.blocked) {
      params.append('filter[blocked]', 'true');
    }
    if (filters?.overdue) {
      params.append('filter[overdue]', 'true');
    }
    if (filters?.tag_id) {
      params.append('filter[tag_id]', filters.tag_id.toString());
    }
    if (filters?.tag_name) {
      params.append('filter[tag_name]', filters.tag_name);
    }

    return fetchApi<ApiResponse<Task[]>>(
      `/api/v1/tasks?${params.toString()}`
    );
  },

  get: async (id: string | number, include?: string[]) => {
    const params = new URLSearchParams();
    if (include && include.length > 0) {
      params.append('include', include.join(','));
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<ApiResponse<Task>>(
      `/api/v1/tasks/${id}${query}`
    );
  },

  create: async (data: {
    title: string;
    description?: string;
    state?: TaskState;
    estimate?: number;
    target_date?: string;
    parent_id?: number;
    plan_id: number; // Required
    cycle_id?: number;
    asset_ids?: number[];
    location_ids?: number[];
    tag_ids?: number[];
  }) => {
    return fetchApi<ApiResponse<Task>>(
      `/api/v1/tasks`,
      {
        method: 'POST',
        body: JSON.stringify({ data: { type: 'task', attributes: data } }),
      }
    );
  },

  update: async (id: string | number, data: Partial<{
    title: string;
    description: string | null;
    state: TaskState;
    estimate: number | null;
    target_date: string | null;
    parent_id: number | null;
    plan_id: number;
    cycle_id: number | null;
    asset_ids: number[];
    location_ids: number[];
    tag_ids: number[];
  }>) => {
    return fetchApi<ApiResponse<Task>>(
      `/api/v1/tasks/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ data: { attributes: data } }),
      }
    );
  },

  delete: async (id: string | number) => {
    return fetchApi<void>(
      `/api/v1/tasks/${id}`,
      {
        method: 'DELETE',
      }
    );
  },

  complete: async (id: string | number) => {
    return tasksApi.update(id, { state: 'done' });
  },

  // Group tasks by state for Kanban view
  listByState: async (filters?: Omit<TaskFilters, 'state'>) => {
    const allTasks = await tasksApi.list(1, 500, filters);
    const grouped: Record<TaskState, Task[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      done: [],
      cancelled: [],
    };

    for (const task of allTasks.data) {
      const state = task.attributes.state;
      if (grouped[state]) {
        grouped[state].push(task);
      }
    }

    return grouped;
  },
};

// ===========================
// Plans API
// ===========================
export interface PlanFilters {
  status?: PlanStatus | PlanStatus[];
  in_progress?: boolean;
  root_only?: boolean;
  parent_id?: number | string;
}

export const plansApi = {
  list: async (page = 1, perPage = 50, filters?: PlanFilters) => {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    });

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        filters.status.forEach(s => params.append('filter[status][]', s));
      } else {
        params.append('filter[status]', filters.status);
      }
    }
    if (filters?.in_progress) {
      params.append('filter[in_progress]', 'true');
    }
    if (filters?.root_only) {
      params.append('filter[root_only]', 'true');
    }
    if (filters?.parent_id) {
      params.append('filter[parent_id]', filters.parent_id.toString());
    }

    return fetchApi<ApiResponse<Plan[]>>(
      `/api/v1/plans?${params.toString()}`
    );
  },

  get: async (id: string | number, include?: string[]) => {
    const params = new URLSearchParams();
    if (include && include.length > 0) {
      params.append('include', include.join(','));
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<ApiResponse<Plan>>(
      `/api/v1/plans/${id}${query}`
    );
  },

  getRoots: async (page = 1, perPage = 50) => {
    return plansApi.list(page, perPage, { root_only: true });
  },

  getChildren: async (parentId: string | number, page = 1, perPage = 50) => {
    return plansApi.list(page, perPage, { parent_id: parentId });
  },

  create: async (data: {
    name: string;
    description?: string;
    status?: PlanStatus;
    start_date?: string;
    target_date?: string;
    parent_id?: number;
  }) => {
    return fetchApi<ApiResponse<Plan>>(
      `/api/v1/plans`,
      {
        method: 'POST',
        body: JSON.stringify({ data: { type: 'plan', attributes: data } }),
      }
    );
  },

  update: async (id: string | number, data: Partial<{
    name: string;
    description: string | null;
    status: PlanStatus;
    start_date: string | null;
    target_date: string | null;
    parent_id: number | null;
  }>) => {
    return fetchApi<ApiResponse<Plan>>(
      `/api/v1/plans/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ data: { attributes: data } }),
      }
    );
  },

  delete: async (id: string | number) => {
    return fetchApi<void>(
      `/api/v1/plans/${id}`,
      {
        method: 'DELETE',
      }
    );
  },
};

// ===========================
// Cycles API
// ===========================
export interface CycleFilters {
  current?: boolean;
  past?: boolean;
  future?: boolean;
}

export const cyclesApi = {
  list: async (page = 1, perPage = 50, filters?: CycleFilters) => {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    });

    if (filters?.current) {
      params.append('filter[current]', 'true');
    }
    if (filters?.past) {
      params.append('filter[past]', 'true');
    }
    if (filters?.future) {
      params.append('filter[future]', 'true');
    }

    return fetchApi<ApiResponse<Cycle[]>>(
      `/api/v1/cycles?${params.toString()}`
    );
  },

  get: async (id: string | number, include?: string[]) => {
    const params = new URLSearchParams();
    if (include && include.length > 0) {
      params.append('include', include.join(','));
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<ApiResponse<Cycle>>(
      `/api/v1/cycles/${id}${query}`
    );
  },

  current: async () => {
    return fetchApi<ApiResponse<Cycle>>(
      `/api/v1/cycles/current`
    );
  },

  create: async (data: {
    name: string;
    start_date: string;
    end_date: string;
  }) => {
    return fetchApi<ApiResponse<Cycle>>(
      `/api/v1/cycles`,
      {
        method: 'POST',
        body: JSON.stringify({ data: { type: 'cycle', attributes: data } }),
      }
    );
  },

  generate: async (params: {
    start_date: string;
    count: number;
    duration_days?: number;
  }) => {
    return fetchApi<ApiResponse<Cycle[]>>(
      `/api/v1/cycles/generate`,
      {
        method: 'POST',
        body: JSON.stringify(params),
      }
    );
  },

  update: async (id: string | number, data: Partial<{
    name: string;
    start_date: string;
    end_date: string;
  }>) => {
    return fetchApi<ApiResponse<Cycle>>(
      `/api/v1/cycles/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ data: { attributes: data } }),
      }
    );
  },

  delete: async (id: string | number) => {
    return fetchApi<void>(
      `/api/v1/cycles/${id}`,
      {
        method: 'DELETE',
      }
    );
  },
};

// ===========================
// Task Relations API
// ===========================
export interface TaskRelationFilters {
  source_task_id?: number | string;
  target_task_id?: number | string;
  relation_type?: TaskRelationType;
}

export const taskRelationsApi = {
  list: async (filters?: TaskRelationFilters) => {
    const params = new URLSearchParams();

    if (filters?.source_task_id) {
      params.append('filter[source_task_id]', filters.source_task_id.toString());
    }
    if (filters?.target_task_id) {
      params.append('filter[target_task_id]', filters.target_task_id.toString());
    }
    if (filters?.relation_type) {
      params.append('filter[relation_type]', filters.relation_type);
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<ApiResponse<TaskRelation[]>>(
      `/api/v1/task_relations${query}`
    );
  },

  create: async (data: {
    source_task_id: number;
    target_task_id: number;
    relation_type: TaskRelationType;
  }) => {
    return fetchApi<ApiResponse<TaskRelation>>(
      `/api/v1/task_relations`,
      {
        method: 'POST',
        body: JSON.stringify({ data: { type: 'task_relation', attributes: data } }),
      }
    );
  },

  delete: async (id: string | number) => {
    return fetchApi<void>(
      `/api/v1/task_relations/${id}`,
      {
        method: 'DELETE',
      }
    );
  },

  // Convenience methods for blocking relationships
  addBlocker: async (taskId: number, blockedByTaskId: number) => {
    return taskRelationsApi.create({
      source_task_id: blockedByTaskId,
      target_task_id: taskId,
      relation_type: 'blocks',
    });
  },

  getBlockers: async (taskId: number) => {
    return taskRelationsApi.list({
      target_task_id: taskId,
      relation_type: 'blocks',
    });
  },

  getBlocking: async (taskId: number) => {
    return taskRelationsApi.list({
      source_task_id: taskId,
      relation_type: 'blocks',
    });
  },
};

// ===========================
// Tags API
// ===========================
export const tagsApi = {
  list: async (page = 1, perPage = 50) => {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    });

    return fetchApi<ApiResponse<Tag[]>>(
      `/api/v1/tags?${params.toString()}`
    );
  },

  get: async (id: string | number) => {
    return fetchApi<ApiResponse<Tag>>(
      `/api/v1/tags/${id}`
    );
  },

  create: async (data: {
    name: string;
    color?: string;
    description?: string;
  }) => {
    return fetchApi<ApiResponse<Tag>>(
      `/api/v1/tags`,
      {
        method: 'POST',
        body: JSON.stringify({ data: { type: 'tag', attributes: data } }),
      }
    );
  },

  update: async (id: string | number, data: Partial<{
    name: string;
    color: string;
    description: string | null;
  }>) => {
    return fetchApi<ApiResponse<Tag>>(
      `/api/v1/tags/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ data: { attributes: data } }),
      }
    );
  },

  delete: async (id: string | number) => {
    return fetchApi<void>(
      `/api/v1/tags/${id}`,
      {
        method: 'DELETE',
      }
    );
  },
};

// ===========================
// Conversations API (Chat History)
// ===========================
export type ConversationStatus = 'active' | 'archived';

export interface Conversation {
  id: string;
  type: 'conversation';
  attributes: {
    title?: string | null;
    external_id?: string | null;
    status: ConversationStatus;
    task_id?: number | null;
    plan_id?: number | null;
    messages: ChatMessage[];
    created_at: string;
    updated_at: string;
    // Computed fields
    default_title?: string;
    has_context?: boolean;
    context_type?: 'task' | 'plan' | null;
    is_active?: boolean;
    is_archived?: boolean;
  };
  relationships?: {
    task?: { data: { id: string; type: string } | null };
    plan?: { data: { id: string; type: string } | null };
  };
}

export interface ConversationFilters {
  status?: ConversationStatus;
  task_id?: number | string;
  plan_id?: number | string;
  with_context?: boolean;
}

export const conversationsApi = {
  list: async (page = 1, perPage = 50, filters?: ConversationFilters) => {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    });

    if (filters?.status) {
      params.append('filter[status]', filters.status);
    }
    if (filters?.task_id) {
      params.append('filter[task_id]', filters.task_id.toString());
    }
    if (filters?.plan_id) {
      params.append('filter[plan_id]', filters.plan_id.toString());
    }
    if (filters?.with_context) {
      params.append('filter[with_context]', 'true');
    }

    return fetchApi<ApiResponse<Conversation[]>>(
      `/api/v1/conversations?${params.toString()}`
    );
  },

  get: async (id: string | number) => {
    return fetchApi<ApiResponse<Conversation>>(
      `/api/v1/conversations/${id}`
    );
  },

  create: async (data: {
    title?: string;
    external_id?: string;
    task_id?: number;
    plan_id?: number;
    messages?: ChatMessage[];
  }) => {
    return fetchApi<ApiResponse<Conversation>>(
      `/api/v1/conversations`,
      {
        method: 'POST',
        body: JSON.stringify({ data: { type: 'conversation', attributes: data } }),
      }
    );
  },

  update: async (id: string | number, data: Partial<{
    title: string | null;
    external_id: string | null;
    status: ConversationStatus;
    task_id: number | null;
    plan_id: number | null;
    messages: ChatMessage[];
  }>) => {
    return fetchApi<ApiResponse<Conversation>>(
      `/api/v1/conversations/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ data: { attributes: data } }),
      }
    );
  },

  delete: async (id: string | number) => {
    return fetchApi<void>(
      `/api/v1/conversations/${id}`,
      {
        method: 'DELETE',
      }
    );
  },

  archive: async (id: string | number) => {
    return conversationsApi.update(id, { status: 'archived' });
  },

  unarchive: async (id: string | number) => {
    return conversationsApi.update(id, { status: 'active' });
  },
};

// ===========================
// Search API (Entity Autocomplete)
// ===========================
export type EntityType = 'asset' | 'location' | 'task' | 'plan' | 'log';

export interface SearchResult {
  type: EntityType;
  id: number;
  name: string;
  icon: string;
  url: string;
  // Type-specific fields
  asset_type?: string;
  location_type?: string;
  state?: string;
  status?: string;
  log_type?: string;
}

export interface SearchResponse {
  data: SearchResult[];
  meta: {
    query: string;
    types: string[];
    total: number;
  };
}

export const searchApi = {
  /**
   * Search entities across multiple types for autocomplete/mentions
   * @param query - Search query (min 1 character)
   * @param types - Entity types to search (default: all)
   * @param limit - Max results (default: 10, max: 50)
   */
  search: async (query: string, types?: EntityType[], limit = 10): Promise<SearchResponse> => {
    const params = new URLSearchParams({ q: query });

    if (types && types.length > 0) {
      params.append('types', types.join(','));
    }

    if (limit !== 10) {
      params.append('limit', limit.toString());
    }

    return fetchApi<SearchResponse>(`/api/v1/search?${params.toString()}`);
  },

  /**
   * Search for a specific entity type
   */
  searchAssets: async (query: string, limit = 10) => {
    return searchApi.search(query, ['asset'], limit);
  },

  searchLocations: async (query: string, limit = 10) => {
    return searchApi.search(query, ['location'], limit);
  },

  searchTasks: async (query: string, limit = 10) => {
    return searchApi.search(query, ['task'], limit);
  },

  searchPlans: async (query: string, limit = 10) => {
    return searchApi.search(query, ['plan'], limit);
  },

  searchLogs: async (query: string, limit = 10) => {
    return searchApi.search(query, ['log'], limit);
  },
};

export { ApiError };

