/**
 * Conversation management hooks for farmOS chat history.
 * Provides React Query hooks for conversation CRUD operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  conversationsApi,
  Conversation as ApiConversation,
  ConversationStatus,
  ConversationFilters,
} from '@/lib/api';
import { toast } from 'sonner';
import { showError } from '@/components/ErrorToast';
import type { ChatMessage } from '@/types/chat';

// Frontend-friendly Conversation interface
export interface Conversation {
  id: string;
  title?: string | null;
  externalId?: string | null;
  status: ConversationStatus;
  taskId?: number | null;
  planId?: number | null;
  assetId?: number | null;
  assetType?: string | null;
  locationId?: number | null;
  logId?: number | null;
  logType?: string | null;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  // Computed fields
  defaultTitle?: string;
  hasContext?: boolean;
  contextType?: 'task' | 'plan' | 'asset' | 'location' | 'log' | null;
  isActive?: boolean;
  isArchived?: boolean;
}

// Convert API Conversation to frontend Conversation
function apiConversationToConversation(apiConversation: ApiConversation): Conversation {
  const attrs = apiConversation.attributes;
  return {
    id: apiConversation.id,
    title: attrs.title,
    externalId: attrs.external_id,
    status: attrs.status,
    taskId: attrs.task_id,
    planId: attrs.plan_id,
    assetId: attrs.asset_id,
    assetType: attrs.asset_type,
    locationId: attrs.location_id,
    logId: attrs.log_id,
    logType: attrs.log_type,
    messages: attrs.messages || [],
    createdAt: attrs.created_at,
    updatedAt: attrs.updated_at,
    defaultTitle: attrs.default_title,
    hasContext: attrs.has_context,
    contextType: attrs.context_type,
    isActive: attrs.is_active,
    isArchived: attrs.is_archived,
  };
}

// Hook to fetch all conversations with filters
export function useConversations(filters?: ConversationFilters) {
  const query = useQuery({
    queryKey: ['conversations', filters],
    queryFn: async () => {
      const response = await conversationsApi.list(1, 100, filters);
      return response.data.map(apiConversationToConversation);
    },
  });

  return {
    ...query,
    conversations: query.data || [],
  };
}

// Hook to fetch active conversations
export function useActiveConversations() {
  return useConversations({ status: 'active' });
}

// Hook to fetch archived conversations
export function useArchivedConversations() {
  return useConversations({ status: 'archived' });
}

// Hook to fetch conversations with context (linked to task/plan)
export function useContextConversations() {
  return useConversations({ with_context: true });
}

// Hook to fetch conversations for a specific task
export function useTaskConversations(taskId: number | string | undefined) {
  const query = useQuery({
    queryKey: ['conversations', 'task', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const response = await conversationsApi.list(1, 50, { task_id: taskId });
      return response.data.map(apiConversationToConversation);
    },
    enabled: !!taskId,
  });

  return {
    ...query,
    conversations: query.data || [],
  };
}

// Hook to fetch conversations for a specific plan
export function usePlanConversations(planId: number | string | undefined) {
  const query = useQuery({
    queryKey: ['conversations', 'plan', planId],
    queryFn: async () => {
      if (!planId) return [];
      const response = await conversationsApi.list(1, 50, { plan_id: planId });
      return response.data.map(apiConversationToConversation);
    },
    enabled: !!planId,
  });

  return {
    ...query,
    conversations: query.data || [],
  };
}

// Hook to fetch a single conversation
export function useConversation(id: string | number | undefined) {
  return useQuery({
    queryKey: ['conversations', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await conversationsApi.get(id);
      return apiConversationToConversation(response.data);
    },
    enabled: !!id,
  });
}

// Hook to create a new conversation
export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      title?: string;
      externalId?: string;
      taskId?: number;
      planId?: number;
      assetId?: number;
      assetType?: string;
      locationId?: number;
      logId?: number;
      logType?: string;
    }) => {
      const response = await conversationsApi.create({
        title: data.title,
        external_id: data.externalId,
        task_id: data.taskId,
        plan_id: data.planId,
        asset_id: data.assetId,
        asset_type: data.assetType,
        location_id: data.locationId,
        log_id: data.logId,
        log_type: data.logType,
      });
      return apiConversationToConversation(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error: any) => {
      console.error('Failed to create conversation:', error);
      showError(error, 'Failed to create conversation');
    },
  });
}

// Hook to update a conversation
export function useUpdateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string | number;
      updates: Partial<{
        title: string | null;
        externalId: string | null;
        status: ConversationStatus;
        taskId: number | null;
        planId: number | null;
        assetId: number | null;
        assetType: string | null;
        locationId: number | null;
        logId: number | null;
        logType: string | null;
      }>;
    }) => {
      const apiUpdates: any = {};
      if (updates.title !== undefined) apiUpdates.title = updates.title;
      if (updates.externalId !== undefined) apiUpdates.external_id = updates.externalId;
      if (updates.status !== undefined) apiUpdates.status = updates.status;
      if (updates.taskId !== undefined) apiUpdates.task_id = updates.taskId;
      if (updates.planId !== undefined) apiUpdates.plan_id = updates.planId;
      if (updates.assetId !== undefined) apiUpdates.asset_id = updates.assetId;
      if (updates.assetType !== undefined) apiUpdates.asset_type = updates.assetType;
      if (updates.locationId !== undefined) apiUpdates.location_id = updates.locationId;
      if (updates.logId !== undefined) apiUpdates.log_id = updates.logId;
      if (updates.logType !== undefined) apiUpdates.log_type = updates.logType;

      const response = await conversationsApi.update(id, apiUpdates);
      return apiConversationToConversation(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error: any) => {
      console.error('Failed to update conversation:', error);
      showError(error, 'Failed to update conversation');
    },
  });
}

// Hook to archive a conversation
export function useArchiveConversation() {
  const updateConversation = useUpdateConversation();

  return useMutation({
    mutationFn: (id: string | number) =>
      updateConversation.mutateAsync({ id, updates: { status: 'archived' } }),
    onSuccess: () => {
      toast.success('Conversation archived');
    },
  });
}

// Hook to unarchive a conversation
export function useUnarchiveConversation() {
  const updateConversation = useUpdateConversation();

  return useMutation({
    mutationFn: (id: string | number) =>
      updateConversation.mutateAsync({ id, updates: { status: 'active' } }),
    onSuccess: () => {
      toast.success('Conversation restored');
    },
  });
}

// Hook to delete a conversation
export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) => conversationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Conversation deleted');
    },
    onError: (error: any) => {
      console.error('Failed to delete conversation:', error);
      showError(error, 'Failed to delete conversation');
    },
  });
}

// Re-export types for convenience
export type { ConversationStatus, ConversationFilters };
