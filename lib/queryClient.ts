import NetInfo from '@react-native-community/netinfo';
import { QueryClient, onlineManager } from '@tanstack/react-query';

import { api, API_BASE } from './api';
import { CHAT_SEND_MUTATION_KEY } from './queryPersister';
import type {
  ChatMessage,
  ChatMessagePage,
  SendMessageVariables,
} from '../features/chat/useChat';
import { useAuthStore } from '../store/authStore';
import { useChatOutboxStore } from '../store/chatOutboxStore';

function apiReachabilityUrl(): string {
  const base = API_BASE.replace(/\/+$/, '').replace(/\/v1$/, '');
  return `${base}/healthz`;
}

// P3.9 — wire React Native's network state into TanStack Query's
// onlineManager. Without this, the library falls back to
// `typeof navigator.onLine`, which is unreliable on RN (returns true even
// when airplane mode is on). With NetInfo, queries pause when offline
// and resume automatically when the device reconnects — no spinner-of-death
// while the user is on the subway, no "request failed" toasts when the
// real issue is "no network".
//
// IOS-LOGIN-106 (2026-05-25): netinfo 11.4.1 was not new-arch compatible —
// it called the legacy `RCTEventEmitter` callable JS module which is never
// registered under RN 0.81 + Fabric. Bumped to 12.0.1, which routes events
// through TurboModule. POSTERVIA-IOS-5/6 should no longer reproduce.
NetInfo.configure({
  reachabilityUrl: apiReachabilityUrl(),
  reachabilityMethod: 'GET',
  reachabilityTest: async (response) => response.status >= 200 && response.status < 600,
  reachabilityShortTimeout: 5000,
  reachabilityLongTimeout: 60_000,
  reachabilityRequestTimeout: 8000,
});

onlineManager.setEventListener((setOnline) => {
  const subscription = NetInfo.addEventListener((state) => {
    // `isConnected` is null while NetInfo determines initial state — treat
    // as online to avoid stalling queries on cold start. Once determined,
    // `isInternetReachable` is the stronger signal (DNS works) when
    // available, falling back to `isConnected` (link layer up).
    const isOnline =
      state.isConnected === false
        ? false
        : state.isInternetReachable !== false;
    setOnline(isOnline);
  });
  return () => subscription();
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: (failureCount, error) => {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 1;
      },
      // MS-16: exponential backoff with full jitter (AWS Builders' Library) —
      // randomizing each client's wait decorrelates retries so a whole cohort
      // of phones coming back online after a subway tunnel doesn't stampede
      // the backend in a synchronized burst.
      retryDelay: (attempt) => Math.round(Math.random() * Math.min(1000 * 2 ** attempt, 8000)),
      refetchOnWindowFocus: false,
      // Default 'online' — when offline, query paused and resumes on reconnect.
      networkMode: 'online',
    },
    mutations: {
      retry: 0,
      // P3.9: 'offlineFirst' means the mutation runs once and only retries
      // if the device is offline (then it queues until connection returns).
      // Better UX than 'online' which would refuse to even start the
      // mutation while offline — many of our mutations have optimistic
      // updates that should fire immediately and reconcile when the network
      // comes back.
      networkMode: 'offlineFirst',
    },
  },
});

// MS-16 / P1: chat sends live on the QueryClient (not the component) so a
// send queued while offline — or killed mid-flight — resumes on relaunch via
// PersistQueryClientProvider.resumePausedMutations(). The component that
// calls the mutation is gone by then, so mutationFn + optimistic
// onMutate/onError/onSuccess must all be registered here.
function chatMessagesPredicate(conversationId: string) {
  return (query: { queryKey: readonly unknown[] }) =>
    query.queryKey[0] === 'chat' &&
    query.queryKey[1] === 'messages' &&
    query.queryKey[2] === conversationId;
}

queryClient.setMutationDefaults([CHAT_SEND_MUTATION_KEY], {
  networkMode: 'offlineFirst',
  mutationFn: async (variables) => {
    const v = variables as unknown as SendMessageVariables;
    const res = await api.post(`/chat/conversations/${v.conversationId}/messages`, {
      type: v.type,
      body: v.body,
      media_url: v.media_url,
      meta: v.meta,
    });
    return res.data.data as ChatMessage;
  },
  onMutate: (variables) => {
    const v = variables as unknown as SendMessageVariables;
    const user = useAuthStore.getState().user;
    const optimistic: ChatMessage = {
      id: v.clientId,
      sender: {
        id: user?.id ?? 'me',
        display_name: user?.display_name ?? '',
        avatar_url: user?.avatar_url ?? null,
      },
      type: v.type,
      body: v.body ?? null,
      media_url: v.media_url ?? null,
      meta: v.meta ?? null,
      created_at: new Date().toISOString(),
      _pending: true,
    };
    // Outbox, not query cache — survives the messages query's 3s refetch poll.
    useChatOutboxStore.getState().add(v.conversationId, optimistic);
  },
  onError: (_err, variables) => {
    const v = variables as unknown as SendMessageVariables;
    useChatOutboxStore.getState().markFailed(v.conversationId, v.clientId);
  },
  onSuccess: (created, variables) => {
    const v = variables as unknown as SendMessageVariables;
    const serverMessage = created as ChatMessage;
    // Move the confirmed message into the server-backed cache (so it stays
    // visible in the gap before the next poll), then drop it from the outbox.
    queryClient.setQueriesData<ChatMessagePage>(
      { predicate: chatMessagesPredicate(v.conversationId) },
      (old) =>
        old && !old.items.some((m) => m.id === serverMessage.id)
          ? { ...old, items: [...old.items, serverMessage] }
          : old,
    );
    useChatOutboxStore.getState().remove(v.conversationId, v.clientId);
    void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
  },
});
