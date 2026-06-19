import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../lib/api';

// Mirrors backend app/odyssey/lane_creator/schemas.py (SessionPublicView / QuotaView /
// LanePublicView). Endpoints are mounted under /v1/odyssey (api baseURL already ends /v1).

export type LaneSessionStatus =
  | 'eliciting'
  | 'researching'
  | 'composing'
  | 'validating'
  | 'completed'
  | 'abandoned'
  | 'failed'
  | 'quota_exceeded';

export interface LaneMessage {
  role: 'ai' | 'user' | 'system';
  content: string;
  timestamp: string;
  options?: string[] | null;
}

export interface LaneNextQuestion {
  content: string;
  options?: string[] | null;
}

export interface LaneSession {
  id: string;
  status: LaneSessionStatus;
  messages: LaneMessage[];
  collected_context: Record<string, unknown>;
  turn_count: number;
  is_partial: boolean;
  confidence?: number | null;
  resulting_lane_id?: string | null;
  next_question?: LaneNextQuestion | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

export interface LaneQuota {
  used: number;
  limit: number;
  month_key: string;
  resets_at: string;
}

export type LaneType = 'explore' | 'trip' | 'process' | 'goal';

export interface TaskLane {
  id: string;
  title: string;
  description?: string | null;
  lane_type: LaneType;
  icon?: string | null;
  status: 'active' | 'archived' | 'abandoned';
  created_by: 'system' | 'user' | 'ai';
  ai_session_id?: string | null;
  sort_order: number;
  created_at: string;
  archived_at?: string | null;
  updated_at: string;
}

// Phases where the backend is doing slow work (Tavily research / LLM compose);
// the session screen polls GET /sessions/{id} until it leaves these.
export const LANE_SLOW_PHASES: LaneSessionStatus[] = ['researching', 'composing', 'validating'];
export const LANE_TERMINAL_STATUSES: LaneSessionStatus[] = [
  'completed',
  'abandoned',
  'failed',
  'quota_exceeded',
];

export function useLaneQuota() {
  return useQuery({
    queryKey: ['lane-creator', 'quota'],
    queryFn: async () => (await api.get('/odyssey/lanes/sessions/quota')).data.data as LaneQuota,
  });
}

export function useStartLaneSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (initialQuery: string) =>
      (await api.post('/odyssey/lanes/sessions', { initial_query: initialQuery })).data.data as LaneSession,
    onSuccess: (session) => {
      qc.setQueryData(['lane-creator', 'session', session.id], session);
      void qc.invalidateQueries({ queryKey: ['lane-creator', 'quota'] });
    },
  });
}

export function useRespondLaneSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId,
      content,
      selectedOption,
    }: {
      sessionId: string;
      content: string;
      selectedOption?: string | null;
    }) =>
      (
        await api.post(`/odyssey/lanes/sessions/${sessionId}/respond`, {
          content,
          selected_option: selectedOption ?? null,
        })
      ).data.data as LaneSession,
    onSuccess: (session) => {
      qc.setQueryData(['lane-creator', 'session', session.id], session);
      void qc.invalidateQueries({ queryKey: ['lane-creator', 'quota'] });
    },
  });
}

// Poll endpoint for slow phases. refetchInterval auto-stops once the session
// leaves researching/composing/validating.
export function useLaneSession(sessionId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['lane-creator', 'session', sessionId],
    queryFn: async () =>
      (await api.get(`/odyssey/lanes/sessions/${sessionId}`)).data.data as LaneSession,
    enabled: enabled && Boolean(sessionId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && LANE_SLOW_PHASES.includes(status) ? 1500 : false;
    },
  });
}

export function useAbandonLaneSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) =>
      (await api.delete(`/odyssey/lanes/sessions/${sessionId}`)).data.data as LaneSession,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lane-creator'] });
    },
  });
}

// Bubble grid (Odyssey home / result display). P0 uses this to show the freshly
// created lane after a session completes.
export function useTaskLanes(status: 'active' | 'archived' | 'abandoned' = 'active') {
  return useQuery({
    queryKey: ['lane-creator', 'lanes', status],
    queryFn: async () =>
      (await api.get('/odyssey/lanes', { params: { status } })).data.data as TaskLane[],
  });
}
