import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagsApi, Tag } from '@/lib/api';
import { showError } from '@/components/ErrorToast';
import { toast } from 'sonner';

export const tagKeys = {
  all: ['tags'] as const,
  lists: () => [...tagKeys.all, 'list'] as const,
  list: () => [...tagKeys.lists()] as const,
  details: () => [...tagKeys.all, 'detail'] as const,
  detail: (id: string | number) => [...tagKeys.details(), id] as const,
};

export function useTags() {
  return useQuery({
    queryKey: tagKeys.list(),
    queryFn: async () => {
      const response = await tagsApi.list(1, 200);
      return response.data;
    },
  });
}

export function useTag(id: string | number | undefined) {
  return useQuery({
    queryKey: tagKeys.detail(id!),
    queryFn: async () => {
      const response = await tagsApi.get(id!);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      color?: string;
      description?: string;
    }) => {
      const response = await tagsApi.create(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
      toast.success('Tag created');
    },
    onError: (error) => {
      showError(error, 'creating tag');
    },
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string | number;
      data: Partial<{
        name: string;
        color: string;
        description: string | null;
      }>;
    }) => {
      const response = await tagsApi.update(id, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
      queryClient.invalidateQueries({ queryKey: tagKeys.detail(variables.id) });
      toast.success('Tag updated');
    },
    onError: (error) => {
      showError(error, 'updating tag');
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string | number) => {
      await tagsApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
      // Also invalidate tasks since they may have had this tag
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tag deleted');
    },
    onError: (error) => {
      showError(error, 'deleting tag');
    },
  });
}

// Helper hook to get tags as a lookup map
export function useTagsMap() {
  const { data: tags } = useTags();

  return tags?.reduce((map, tag) => {
    map[tag.id] = tag;
    return map;
  }, {} as Record<string, Tag>) ?? {};
}
