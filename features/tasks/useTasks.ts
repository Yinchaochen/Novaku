import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

export function useDag() {
  const { langCode } = useLanguage();
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ['tasks', 'dag', user?.id, user?.city, user?.identity, langCode],
    queryFn: async () => {
      const res = await api.get('/tasks/dag', {
        timeout: 30000,
        params: {
          city: user?.city,
          identity: user?.identity,
        },
      });
      return res.data.data;
    },
    enabled: Boolean(user),
    placeholderData: (previousData) => previousData,
  });
}

export function useStartTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => api.post(`/tasks/${taskId}/start`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => api.post(`/tasks/${taskId}/complete`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useSkipTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => api.post(`/tasks/${taskId}/skip`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}
