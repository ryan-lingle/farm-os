import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetsApi, Asset } from '@/lib/api';
import { toast } from 'sonner';

export function useAssets(assetType: string, page = 1, perPage = 50, filters?: {
  root_only?: boolean;
  parent_id?: string | number;
  current_location_id?: string | number;
}) {
  return useQuery({
    queryKey: ['assets', assetType, page, perPage, filters],
    queryFn: () => assetsApi.list(assetType, page, perPage, filters),
  });
}

export function useAsset(assetType: string, id: string, include?: string[]) {
  return useQuery({
    queryKey: ['assets', assetType, id, include],
    queryFn: () => assetsApi.get(assetType, id, include),
    enabled: !!id,
  });
}

export function useRootAssets(assetType: string, page = 1, perPage = 50) {
  return useQuery({
    queryKey: ['assets', assetType, 'roots', page, perPage],
    queryFn: () => assetsApi.getRoots(assetType, page, perPage),
  });
}

export function useChildAssets(assetType: string, parentId: string | number | undefined, page = 1, perPage = 50) {
  return useQuery({
    queryKey: ['assets', assetType, 'children', parentId, page, perPage],
    queryFn: () => assetsApi.getChildren(assetType, parentId!, page, perPage),
    enabled: !!parentId,
  });
}

export function useCreateAsset(assetType: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Asset['attributes']>) => 
      assetsApi.create(assetType, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets', assetType] });
      toast.success(`${assetType.charAt(0).toUpperCase() + assetType.slice(1)} created successfully`);
    },
    onError: (error: any) => {
      toast.error(`Failed to create ${assetType}: ${error.message}`);
    },
  });
}

export function useUpdateAsset(assetType: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Asset['attributes']> }) =>
      assetsApi.update(assetType, id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assets', assetType] });
      queryClient.invalidateQueries({ queryKey: ['assets', assetType, variables.id] });
      toast.success(`${assetType.charAt(0).toUpperCase() + assetType.slice(1)} updated successfully`);
    },
    onError: (error: any) => {
      toast.error(`Failed to update ${assetType}: ${error.message}`);
    },
  });
}

export function useDeleteAsset(assetType: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => assetsApi.delete(assetType, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets', assetType] });
      toast.success(`${assetType.charAt(0).toUpperCase() + assetType.slice(1)} deleted successfully`);
    },
    onError: (error: any) => {
      toast.error(`Failed to delete ${assetType}: ${error.message}`);
    },
  });
}

// Hook to fetch all assets at a specific location (including child locations)
export function useAssetsAtLocation(locationId: string | number | undefined, locations?: any[]) {
  const assetTypes = ['animal', 'plant', 'equipment', 'structure', 'compost', 'material'];
  
  // Get all location IDs to query (this location + all descendants)
  const locationIdsToQuery = React.useMemo(() => {
    if (!locationId || !locations) return [locationId];
    
    const getAllDescendants = (id: string | number): (string | number)[] => {
      const children = locations.filter(loc => String(loc.parent_id) === String(id));
      const allIds = [id];
      
      children.forEach(child => {
        allIds.push(...getAllDescendants(child.id));
      });
      
      return allIds;
    };
    
    return getAllDescendants(locationId);
  }, [locationId, locations]);

  // Fetch assets for each asset type and each location
  const queries = assetTypes.flatMap(assetType => 
    locationIdsToQuery.map(locId => 
      useQuery({
        queryKey: ['assets', assetType, 'location', locId],
        queryFn: () => assetsApi.list(assetType, 1, 100, { current_location_id: locId }),
        enabled: !!locId,
      })
    )
  );

  return {
    assets: queries.flatMap(q => q.data?.data || []),
    isLoading: queries.some(q => q.isLoading),
    isError: queries.some(q => q.isError),
  };
}

