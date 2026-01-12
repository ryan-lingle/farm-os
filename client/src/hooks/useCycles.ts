/**
 * Cycle management hooks for farmOS.
 * Provides React Query hooks for cycle CRUD operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  cyclesApi,
  Cycle as ApiCycle,
  CycleFilters,
} from '@/lib/api';
import { toast } from 'sonner';
import { showError } from '@/components/ErrorToast';

// Frontend-friendly Cycle interface
export interface Cycle {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  // Computed fields
  isCurrent?: boolean;
  isPast?: boolean;
  isFuture?: boolean;
  daysRemaining?: number;
  daysElapsed?: number;
  totalDays?: number;
  progressPercentage?: number;
  taskCount?: number;
  completedTaskCount?: number;
  activeTaskCount?: number;
  taskCompletionPercentage?: number;
  totalEstimate?: number;
  completedEstimate?: number;
}

// Convert API Cycle to frontend Cycle
function apiCycleToCycle(apiCycle: ApiCycle): Cycle {
  const attrs = apiCycle.attributes;
  return {
    id: apiCycle.id,
    name: attrs.name,
    startDate: attrs.start_date,
    endDate: attrs.end_date,
    createdAt: attrs.created_at,
    updatedAt: attrs.updated_at,
    isCurrent: attrs.is_current,
    isPast: attrs.is_past,
    isFuture: attrs.is_future,
    daysRemaining: attrs.days_remaining,
    daysElapsed: attrs.days_elapsed,
    totalDays: attrs.total_days,
    progressPercentage: attrs.progress_percentage,
    taskCount: attrs.task_count,
    completedTaskCount: attrs.completed_task_count,
    activeTaskCount: attrs.active_task_count,
    taskCompletionPercentage: attrs.task_completion_percentage,
    totalEstimate: attrs.total_estimate,
    completedEstimate: attrs.completed_estimate,
  };
}

// Hook to fetch all cycles with filters
export function useCycles(filters?: CycleFilters) {
  const query = useQuery({
    queryKey: ['cycles', filters],
    queryFn: async () => {
      const response = await cyclesApi.list(1, 100, filters);
      return response.data.map(apiCycleToCycle);
    },
  });

  return {
    ...query,
    cycles: query.data || [],
  };
}

// Hook to fetch the current cycle
export function useCurrentCycle() {
  return useQuery({
    queryKey: ['cycles', 'current'],
    queryFn: async () => {
      try {
        const response = await cyclesApi.current();
        return apiCycleToCycle(response.data);
      } catch (error: any) {
        // If no current cycle exists, return null instead of throwing
        if (error.status === 404) {
          return null;
        }
        throw error;
      }
    },
  });
}

// Hook to fetch past cycles
export function usePastCycles() {
  return useCycles({ past: true });
}

// Hook to fetch future cycles
export function useFutureCycles() {
  return useCycles({ future: true });
}

// Hook to fetch a single cycle
export function useCycle(id: string | number | undefined, include?: string[]) {
  return useQuery({
    queryKey: ['cycles', id, include],
    queryFn: async () => {
      if (!id) return null;
      const response = await cyclesApi.get(id, include);
      return apiCycleToCycle(response.data);
    },
    enabled: !!id,
  });
}

// Hook to create a new cycle
export function useCreateCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      startDate: string;
      endDate: string;
    }) => {
      const response = await cyclesApi.create({
        name: data.name,
        start_date: data.startDate,
        end_date: data.endDate,
      });
      return apiCycleToCycle(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
      toast.success('Cycle created');
    },
    onError: (error: any) => {
      console.error('Failed to create cycle:', error);
      showError(error, 'Failed to create cycle');
    },
  });
}

// Hook to generate multiple cycles
export function useGenerateCycles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      startDate: string;
      count: number;
      durationDays?: number;
    }) => {
      const response = await cyclesApi.generate({
        start_date: params.startDate,
        count: params.count,
        duration_days: params.durationDays,
      });
      return response.data.map(apiCycleToCycle);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
      toast.success(`Generated ${data.length} cycles`);
    },
    onError: (error: any) => {
      console.error('Failed to generate cycles:', error);
      showError(error, 'Failed to generate cycles');
    },
  });
}

// Hook to update a cycle
export function useUpdateCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string | number;
      updates: Partial<{
        name: string;
        startDate: string;
        endDate: string;
      }>;
    }) => {
      const apiUpdates: any = {};
      if (updates.name !== undefined) apiUpdates.name = updates.name;
      if (updates.startDate !== undefined) apiUpdates.start_date = updates.startDate;
      if (updates.endDate !== undefined) apiUpdates.end_date = updates.endDate;

      const response = await cyclesApi.update(id, apiUpdates);
      return apiCycleToCycle(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
      toast.success('Cycle updated');
    },
    onError: (error: any) => {
      console.error('Failed to update cycle:', error);
      showError(error, 'Failed to update cycle');
    },
  });
}

// Hook to delete a cycle
export function useDeleteCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) => cyclesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
      toast.success('Cycle deleted');
    },
    onError: (error: any) => {
      console.error('Failed to delete cycle:', error);
      showError(error, 'Failed to delete cycle');
    },
  });
}

// Re-export types for convenience
export type { CycleFilters };
