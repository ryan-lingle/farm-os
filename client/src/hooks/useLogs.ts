import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { logsApi, Log } from '@/lib/api';
import { toast } from 'sonner';
import { showError } from '@/components/ErrorToast';

export function useLogs(logType: string, page = 1, perPage = 50) {
  return useQuery({
    queryKey: ['logs', logType, page, perPage],
    queryFn: () => logsApi.list(logType, page, perPage),
  });
}

export function useLog(logType: string, id: string) {
  return useQuery({
    queryKey: ['logs', logType, id],
    queryFn: () => logsApi.get(logType, id),
    enabled: !!id,
  });
}

export function useCreateLog(logType: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Log['attributes']>) => 
      logsApi.create(logType, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs', logType] });
      toast.success(`${logType.charAt(0).toUpperCase() + logType.slice(1)} log created successfully`);
    },
    onError: (error: any) => {
      showError(error, `Failed to create ${logType} log`);
    },
  });
}

export function useUpdateLog(logType: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Log['attributes']> }) =>
      logsApi.update(logType, id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['logs', logType] });
      queryClient.invalidateQueries({ queryKey: ['logs', logType, variables.id] });
      toast.success(`${logType.charAt(0).toUpperCase() + logType.slice(1)} log updated successfully`);
    },
    onError: (error: any) => {
      showError(error, `Failed to update ${logType} log`);
    },
  });
}

export function useDeleteLog(logType: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => logsApi.delete(logType, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs', logType] });
      toast.success(`${logType.charAt(0).toUpperCase() + logType.slice(1)} log archived successfully`);
    },
    onError: (error: any) => {
      showError(error, `Failed to archive ${logType} log`);
    },
  });
}

export function useCompleteLog(logType: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => logsApi.complete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['logs', logType] });
      queryClient.invalidateQueries({ queryKey: ['logs', logType, id] });
      queryClient.invalidateQueries({ queryKey: ['assets'] }); // Refresh assets as output assets may be created
      toast.success(`${logType.charAt(0).toUpperCase() + logType.slice(1)} log completed successfully`);
    },
    onError: (error: any) => {
      showError(error, `Failed to complete ${logType} log`);
    },
  });
}

