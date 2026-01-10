import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { locationsApi, convertGeoJsonToFarmApi, convertFarmApiToGeoJson, Location as ApiLocation } from '@/lib/api';
import { toast } from 'sonner';

// Frontend-friendly Location interface that uses GeoJSON for easy map integration
export interface Location {
  id: string;
  name: string;
  description?: string;
  location_type: 'point' | 'polygon';
  geometry: {
    type: 'Polygon' | 'Point';
    coordinates: number[][][] | number[];
  } | null;
  status?: string | null;
  area_acres?: number | null;
  asset_count?: number;
  total_asset_count?: number;
  center_point?: {
    latitude: number;
    longitude: number;
  } | null;
  // Hierarchy fields
  parent_id?: number | null;
  depth?: number;
  is_root?: boolean;
  is_leaf?: boolean;
  child_count?: number;
  createdAt: string;
  updatedAt: string;
}

// Convert API Location to frontend Location (farmAPI → GeoJSON)
function apiLocationToLocation(apiLoc: ApiLocation): Location {
  const geoJson = convertFarmApiToGeoJson(apiLoc);
  
  return {
    id: apiLoc.id,
    name: apiLoc.attributes.name,
    description: apiLoc.attributes.notes || undefined,
    location_type: apiLoc.attributes.location_type,
    geometry: geoJson.geometry as any,
    status: apiLoc.attributes.status,
    area_acres: apiLoc.attributes.area_in_acres,
    asset_count: apiLoc.attributes.asset_count,
    total_asset_count: apiLoc.attributes.total_asset_count,
    center_point: apiLoc.attributes.center_point,
    parent_id: apiLoc.attributes.parent_id,
    depth: apiLoc.attributes.depth,
    is_root: apiLoc.attributes.is_root,
    is_leaf: apiLoc.attributes.is_leaf,
    child_count: apiLoc.attributes.child_count,
    createdAt: apiLoc.attributes.created_at,
    updatedAt: apiLoc.attributes.updated_at,
  };
}

// Hook to fetch all locations (with optional filters)
export function useLocations(filters?: {
  root_only?: boolean;
  parent_id?: string | number;
}) {
  const query = useQuery({
    queryKey: ['locations', filters],
    queryFn: async () => {
      const response = await locationsApi.list(1, 100, filters);
      return response.data.map(apiLocationToLocation);
    },
  });

  return {
    ...query,
    locations: query.data || [],
  };
}

// Hook to fetch root locations only
export function useRootLocations() {
  return useLocations({ root_only: true });
}

// Hook to fetch children of a specific location
export function useChildLocations(parentId: string | number | undefined) {
  const query = useQuery({
    queryKey: ['locations', 'children', parentId],
    queryFn: async () => {
      if (!parentId) return [];
      const response = await locationsApi.getChildren(parentId);
      return response.data.map(apiLocationToLocation);
    },
    enabled: !!parentId,
  });

  return {
    ...query,
    locations: query.data || [],
  };
}

// Hook to fetch a single location with includes
export function useLocation(id: string | undefined, include?: string[]) {
  return useQuery({
    queryKey: ['locations', id, include],
    queryFn: async () => {
      if (!id) return null;
      const response = await locationsApi.get(id, include);
      return apiLocationToLocation(response.data);
    },
    enabled: !!id,
  });
}

// Hook to create a new location
export function useCreateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (location: Omit<Location, 'id' | 'createdAt' | 'updatedAt' | 'area_acres' | 'asset_count' | 'total_asset_count' | 'center_point' | 'depth' | 'is_root' | 'is_leaf' | 'child_count'>) => {
      // Convert GeoJSON geometry to farmAPI format
      const farmApiGeometry = convertGeoJsonToFarmApi(location.geometry);
      
      // Determine location type from geometry
      const location_type: 'point' | 'polygon' = location.geometry.type === 'Point' ? 'point' : 'polygon';
      
      const response = await locationsApi.create({
        name: location.name,
        location_type,
        geometry: farmApiGeometry,
        notes: location.description,
        status: location.status || undefined,
        parent_id: location.parent_id,
      });
      
      return apiLocationToLocation(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Location saved successfully');
    },
    onError: (error: any) => {
      console.error('Failed to create location:', error);
      toast.error(`Failed to save location: ${error.message}`);
    },
  });
}

// Hook to update an existing location
export function useUpdateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Location> }) => {
      const apiData: any = {};
      
      if (updates.name !== undefined) {
        apiData.name = updates.name;
      }
      
      if (updates.description !== undefined) {
        apiData.notes = updates.description;
      }
      
      if (updates.status !== undefined) {
        apiData.status = updates.status;
      }
      
      if (updates.parent_id !== undefined) {
        apiData.parent_id = updates.parent_id;
      }
      
      if (updates.geometry !== undefined) {
        // Convert GeoJSON geometry to farmAPI format
        apiData.geometry = convertGeoJsonToFarmApi(updates.geometry);
        // Update location type if geometry changed
        apiData.location_type = updates.geometry.type === 'Point' ? 'point' : 'polygon';
      }
      
      const response = await locationsApi.update(id, apiData);
      return apiLocationToLocation(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Location updated successfully');
    },
    onError: (error: any) => {
      console.error('Failed to update location:', error);
      toast.error(`Failed to update location: ${error.message}`);
    },
  });
}

// Hook to delete a location
export function useDeleteLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => locationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Location deleted successfully');
    },
    onError: (error: any) => {
      console.error('Failed to delete location:', error);
      toast.error(`Failed to delete location: ${error.message}`);
    },
  });
}
