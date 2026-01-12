/**
 * Plan management hooks for farmOS.
 * Provides React Query hooks for plan CRUD operations.
 * Plans are recursive - they can contain other plans.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  plansApi,
  Plan as ApiPlan,
  PlanStatus,
  PlanFilters,
} from '@/lib/api';
import { toast } from 'sonner';
import { showError } from '@/components/ErrorToast';

// Frontend-friendly Plan interface
export interface Plan {
  id: string;
  name: string;
  description?: string | null;
  status: PlanStatus;
  startDate?: string | null;
  targetDate?: string | null;
  parentId?: number | null;
  createdAt: string;
  updatedAt: string;
  // Computed fields
  taskCount?: number;
  completedTaskCount?: number;
  activeTaskCount?: number;
  progressPercentage?: number;
  totalEstimate?: number;
  totalEstimateDisplay?: string;
  isInProgress?: boolean;
  // Hierarchy fields
  depth?: number;
  isRoot?: boolean;
  isLeaf?: boolean;
  childCount?: number;
  directTaskCount?: number;
}

// Convert API Plan to frontend Plan
function apiPlanToPlan(apiPlan: ApiPlan): Plan {
  const attrs = apiPlan.attributes;
  return {
    id: apiPlan.id,
    name: attrs.name,
    description: attrs.description,
    status: attrs.status,
    startDate: attrs.start_date,
    targetDate: attrs.target_date,
    parentId: attrs.parent_id,
    createdAt: attrs.created_at,
    updatedAt: attrs.updated_at,
    taskCount: attrs.task_count,
    completedTaskCount: attrs.completed_task_count,
    activeTaskCount: attrs.active_task_count,
    progressPercentage: attrs.progress_percentage,
    totalEstimate: attrs.total_estimate,
    totalEstimateDisplay: attrs.total_estimate_display,
    isInProgress: attrs.is_in_progress,
    depth: attrs.depth,
    isRoot: attrs.is_root,
    isLeaf: attrs.is_leaf,
    childCount: attrs.child_count,
    directTaskCount: attrs.direct_task_count,
  };
}

// Hook to fetch all plans with filters
export function usePlans(filters?: PlanFilters) {
  const query = useQuery({
    queryKey: ['plans', filters],
    queryFn: async () => {
      const response = await plansApi.list(1, 100, filters);
      return response.data.map(apiPlanToPlan);
    },
  });

  return {
    ...query,
    plans: query.data || [],
  };
}

// Hook to fetch root plans only
export function useRootPlans() {
  return usePlans({ root_only: true });
}

// Hook to fetch children of a specific plan
export function useChildPlans(parentId: string | number | undefined) {
  const query = useQuery({
    queryKey: ['plans', 'children', parentId],
    queryFn: async () => {
      if (!parentId) return [];
      const response = await plansApi.getChildren(parentId);
      return response.data.map(apiPlanToPlan);
    },
    enabled: !!parentId,
  });

  return {
    ...query,
    plans: query.data || [],
  };
}

// Hook to fetch active plans
export function useActivePlans() {
  return usePlans({ in_progress: true });
}

// Hook to fetch a single plan
export function usePlan(id: string | number | undefined, include?: string[]) {
  return useQuery({
    queryKey: ['plans', id, include],
    queryFn: async () => {
      if (!id) return null;
      const response = await plansApi.get(id, include);
      return apiPlanToPlan(response.data);
    },
    enabled: !!id,
  });
}

// Hook to create a new plan
export function useCreatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      status?: PlanStatus;
      startDate?: string;
      targetDate?: string;
      parentId?: number;
    }) => {
      const response = await plansApi.create({
        name: data.name,
        description: data.description,
        status: data.status,
        start_date: data.startDate,
        target_date: data.targetDate,
        parent_id: data.parentId,
      });
      return apiPlanToPlan(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plan created');
    },
    onError: (error: any) => {
      console.error('Failed to create plan:', error);
      showError(error, 'Failed to create plan');
    },
  });
}

// Hook to update a plan
export function useUpdatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string | number;
      updates: Partial<{
        name: string;
        description: string | null;
        status: PlanStatus;
        startDate: string | null;
        targetDate: string | null;
        parentId: number | null;
      }>;
    }) => {
      const apiUpdates: any = {};
      if (updates.name !== undefined) apiUpdates.name = updates.name;
      if (updates.description !== undefined) apiUpdates.description = updates.description;
      if (updates.status !== undefined) apiUpdates.status = updates.status;
      if (updates.startDate !== undefined) apiUpdates.start_date = updates.startDate;
      if (updates.targetDate !== undefined) apiUpdates.target_date = updates.targetDate;
      if (updates.parentId !== undefined) apiUpdates.parent_id = updates.parentId;

      const response = await plansApi.update(id, apiUpdates);
      return apiPlanToPlan(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plan updated');
    },
    onError: (error: any) => {
      console.error('Failed to update plan:', error);
      showError(error, 'Failed to update plan');
    },
  });
}

// Hook to delete a plan
export function useDeletePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) => plansApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plan deleted');
    },
    onError: (error: any) => {
      console.error('Failed to delete plan:', error);
      showError(error, 'Failed to delete plan');
    },
  });
}

// Re-export types for convenience
export type { PlanStatus, PlanFilters };
