/**
 * Task management hooks for farmOS.
 * Provides React Query hooks for task CRUD operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  tasksApi,
  Task as ApiTask,
  TaskState,
  TaskFilters,
} from '@/lib/api';
import { toast } from 'sonner';

// Frontend-friendly Task interface
export interface Task {
  id: string;
  title: string;
  description?: string | null;
  state: TaskState;
  estimate?: number | null;
  estimateDisplay?: string | null;
  estimateInHours?: number | null;
  targetDate?: string | null;
  parentId?: number | null;
  planId: number;
  cycleId?: number | null;
  createdAt: string;
  updatedAt: string;
  // Computed fields
  depth?: number;
  isRoot?: boolean;
  isLeaf?: boolean;
  childCount?: number;
  isActive?: boolean;
  isCompleted?: boolean;
  isBlocked?: boolean;
  blocksCount?: number;
  blockedByCount?: number;
}

// Convert API Task to frontend Task
function apiTaskToTask(apiTask: ApiTask): Task {
  const attrs = apiTask.attributes;
  return {
    id: apiTask.id,
    title: attrs.title,
    description: attrs.description,
    state: attrs.state,
    estimate: attrs.estimate,
    estimateDisplay: attrs.estimate_display,
    estimateInHours: attrs.estimate_in_hours,
    targetDate: attrs.target_date,
    parentId: attrs.parent_id,
    planId: attrs.plan_id,
    cycleId: attrs.cycle_id,
    createdAt: attrs.created_at,
    updatedAt: attrs.updated_at,
    depth: attrs.depth,
    isRoot: attrs.is_root,
    isLeaf: attrs.is_leaf,
    childCount: attrs.child_count,
    isActive: attrs.is_active,
    isCompleted: attrs.is_completed,
    isBlocked: attrs.is_blocked,
    blocksCount: attrs.blocks_count,
    blockedByCount: attrs.blocked_by_count,
  };
}

// Hook to fetch all tasks with filters
export function useTasks(filters?: TaskFilters) {
  const query = useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      const response = await tasksApi.list(1, 200, filters);
      return response.data.map(apiTaskToTask);
    },
  });

  return {
    ...query,
    tasks: query.data || [],
  };
}

// Hook to fetch tasks grouped by state (for Kanban)
export function useTasksByState(filters?: Omit<TaskFilters, 'state'>) {
  const query = useQuery({
    queryKey: ['tasks', 'byState', filters],
    queryFn: async () => {
      const grouped = await tasksApi.listByState(filters);
      return {
        backlog: grouped.backlog.map(apiTaskToTask),
        todo: grouped.todo.map(apiTaskToTask),
        in_progress: grouped.in_progress.map(apiTaskToTask),
        done: grouped.done.map(apiTaskToTask),
        cancelled: grouped.cancelled.map(apiTaskToTask),
      };
    },
  });

  return {
    ...query,
    tasksByState: query.data || {
      backlog: [],
      todo: [],
      in_progress: [],
      done: [],
      cancelled: [],
    },
  };
}

// Hook to fetch active tasks (todo or in_progress)
export function useActiveTasks(filters?: Omit<TaskFilters, 'active'>) {
  return useTasks({ ...filters, active: true });
}

// Hook to fetch overdue tasks
export function useOverdueTasks(filters?: Omit<TaskFilters, 'overdue'>) {
  return useTasks({ ...filters, overdue: true });
}

// Hook to fetch blocked tasks
export function useBlockedTasks(filters?: Omit<TaskFilters, 'blocked'>) {
  return useTasks({ ...filters, blocked: true });
}

// Hook to fetch unscheduled tasks (no cycle)
export function useUnscheduledTasks(filters?: Omit<TaskFilters, 'unscheduled'>) {
  return useTasks({ ...filters, unscheduled: true });
}

// Hook to fetch a single task
export function useTask(id: string | number | undefined, include?: string[]) {
  return useQuery({
    queryKey: ['tasks', id, include],
    queryFn: async () => {
      if (!id) return null;
      const response = await tasksApi.get(id, include);
      return apiTaskToTask(response.data);
    },
    enabled: !!id,
  });
}

// Hook to fetch subtasks
export function useSubtasks(parentId: string | number | undefined) {
  const query = useQuery({
    queryKey: ['tasks', 'subtasks', parentId],
    queryFn: async () => {
      if (!parentId) return [];
      const response = await tasksApi.list(1, 100, { parent_id: parentId });
      return response.data.map(apiTaskToTask);
    },
    enabled: !!parentId,
  });

  return {
    ...query,
    subtasks: query.data || [],
  };
}

// Hook to create a new task
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      planId: number;
      description?: string;
      state?: TaskState;
      estimate?: number;
      targetDate?: string;
      parentId?: number;
      cycleId?: number;
      assetIds?: number[];
      locationIds?: number[];
    }) => {
      const response = await tasksApi.create({
        title: data.title,
        plan_id: data.planId,
        description: data.description,
        state: data.state,
        estimate: data.estimate,
        target_date: data.targetDate,
        parent_id: data.parentId,
        cycle_id: data.cycleId,
        asset_ids: data.assetIds,
        location_ids: data.locationIds,
      });
      return apiTaskToTask(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task created');
    },
    onError: (error: any) => {
      console.error('Failed to create task:', error);
      toast.error(`Failed to create task: ${error.message}`);
    },
  });
}

// Hook to update a task
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string | number;
      updates: Partial<{
        title: string;
        description: string | null;
        state: TaskState;
        estimate: number | null;
        targetDate: string | null;
        parentId: number | null;
        planId: number;
        cycleId: number | null;
        assetIds: number[];
        locationIds: number[];
      }>;
    }) => {
      const apiUpdates: any = {};
      if (updates.title !== undefined) apiUpdates.title = updates.title;
      if (updates.description !== undefined) apiUpdates.description = updates.description;
      if (updates.state !== undefined) apiUpdates.state = updates.state;
      if (updates.estimate !== undefined) apiUpdates.estimate = updates.estimate;
      if (updates.targetDate !== undefined) apiUpdates.target_date = updates.targetDate;
      if (updates.parentId !== undefined) apiUpdates.parent_id = updates.parentId;
      if (updates.planId !== undefined) apiUpdates.plan_id = updates.planId;
      if (updates.cycleId !== undefined) apiUpdates.cycle_id = updates.cycleId;
      if (updates.assetIds !== undefined) apiUpdates.asset_ids = updates.assetIds;
      if (updates.locationIds !== undefined) apiUpdates.location_ids = updates.locationIds;

      const response = await tasksApi.update(id, apiUpdates);
      return apiTaskToTask(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task updated');
    },
    onError: (error: any) => {
      console.error('Failed to update task:', error);
      toast.error(`Failed to update task: ${error.message}`);
    },
  });
}

// Hook to complete a task (convenience)
export function useCompleteTask() {
  const updateTask = useUpdateTask();

  return useMutation({
    mutationFn: (id: string | number) => updateTask.mutateAsync({ id, updates: { state: 'done' } }),
    onSuccess: () => {
      toast.success('Task completed');
    },
  });
}

// Hook to delete a task
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) => tasksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted');
    },
    onError: (error: any) => {
      console.error('Failed to delete task:', error);
      toast.error(`Failed to delete task: ${error.message}`);
    },
  });
}

// Re-export TaskState for convenience
export type { TaskState, TaskFilters };
