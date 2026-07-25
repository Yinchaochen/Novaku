/**
 * Tests the chat-send mutation defaults registered on the QueryClient
 * (lib/queryClient.ts) — the MS-16 local-first send path: optimistic message
 * goes into the outbox (not the query cache), failure marks it retryable,
 * success moves it into the messages cache and clears the outbox.
 */
import { api } from '../api';
import NetInfo from '@react-native-community/netinfo';
import { createElement, type ReactNode } from 'react';
import { QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { CHAT_SEND_MUTATION_KEY } from '../queryPersister';
import { queryClient } from '../queryClient';
import { useChatOutboxStore } from '../../store/chatOutboxStore';
import { useAuthStore } from '../../store/authStore';
import {
  useSendMessage,
  type ChatMessage,
  type SendMessageVariables,
} from '../../features/chat/useChat';

let mockAuthUser: { id: string; display_name: string; avatar_url: string | null } | null = null;

jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock.js'),
);
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../sentry', () => ({
  addSentryBreadcrumb: jest.fn(),
  reportToSentry: jest.fn(),
}));
jest.mock('../../store/authStore', () => ({
  useAuthStore: {
    getState: () => ({ user: mockAuthUser }),
    setState: (state: { user?: typeof mockAuthUser }) => {
      mockAuthUser = state.user ?? null;
    },
  },
}));
jest.mock('../api', () => ({
  API_BASE: 'https://api.test.invalid/v1',
  api: { post: jest.fn() },
}));

const defaults = queryClient.getMutationDefaults([CHAT_SEND_MUTATION_KEY]);

const variables: SendMessageVariables = {
  conversationId: 'conv1',
  clientId: 'temp-abc',
  type: 'text',
  body: 'hello from the subway',
};

const mutationContext = {
  client: queryClient,
  meta: undefined,
  mutationKey: [CHAT_SEND_MUTATION_KEY],
} as never;

function QueryWrapper({ children }: { children: ReactNode }) {
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

function serverMessage(id: string): ChatMessage {
  return {
    id,
    sender: { id: 'u1', display_name: 'Me', avatar_url: null },
    type: 'text',
    body: 'hello from the subway',
    media_url: null,
    meta: null,
    created_at: '2026-07-03T10:00:00Z',
  };
}

describe('chat send mutation defaults', () => {
  beforeEach(() => {
    onlineManager.setOnline(true);
    queryClient.clear();
    useChatOutboxStore.setState({ byConversation: {} });
    useAuthStore.setState({
      user: { id: 'u1', display_name: 'Me', avatar_url: null } as never,
    });
    (api.post as jest.Mock).mockReset();
  });

  afterEach(() => {
    onlineManager.setOnline(true);
  });

  it('registers mutationFn + optimistic handlers on the client', () => {
    expect(defaults.mutationFn).toBeDefined();
    expect(defaults.onMutate).toBeDefined();
    expect(defaults.onError).toBeDefined();
    expect(defaults.onSuccess).toBeDefined();
    expect(defaults.networkMode).toBe('online');
  });

  it('keeps an offline send paused and submits it once after reconnecting', async () => {
    onlineManager.setOnline(false);
    (api.post as jest.Mock).mockResolvedValue({ data: { data: serverMessage('m1') } });

    const mutation = queryClient.getMutationCache().build(queryClient, {
      mutationKey: [CHAT_SEND_MUTATION_KEY],
    });
    const execution = mutation.execute(variables);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const offlineState = {
      status: mutation.state.status,
      isPaused: mutation.state.isPaused,
      postCalls: (api.post as jest.Mock).mock.calls.length,
      outboxPending:
        useChatOutboxStore.getState().byConversation['conv1']?.['temp-abc']?._pending,
    };

    onlineManager.setOnline(true);
    await queryClient.resumePausedMutations();
    await execution;

    expect(offlineState.status).toBe('pending');
    expect(offlineState.isPaused).toBe(true);
    expect(offlineState.postCalls).toBe(0);
    expect(offlineState.outboxPending).toBe(true);

    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it('uses the configured Postervia API health endpoint for NetInfo reachability', () => {
    expect(NetInfo.configure).toHaveBeenCalledWith(
      expect.objectContaining({
        reachabilityUrl: 'https://api.test.invalid/healthz',
        reachabilityMethod: 'GET',
      }),
    );
  });

  it('mutationFn sends the stable client id as the idempotency key', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { data: serverMessage('m1') } });
    await defaults.mutationFn!(variables, mutationContext);
    expect(api.post).toHaveBeenCalledWith('/chat/conversations/conv1/messages', {
      type: 'text',
      body: 'hello from the subway',
      media_url: undefined,
      meta: undefined,
      client_id: 'temp-abc',
    });
  });

  it('onMutate puts an optimistic _pending message into the outbox, not the query cache', async () => {
    await defaults.onMutate!(variables, mutationContext);
    const outboxed = useChatOutboxStore.getState().byConversation['conv1']['temp-abc'];
    expect(outboxed._pending).toBe(true);
    expect(outboxed.body).toBe('hello from the subway');
    expect(outboxed.sender.id).toBe('u1');
    expect(queryClient.getQueryData(['chat', 'messages', 'conv1'])).toBeUndefined();
  });

  it('onError marks the outbox message failed (kept for tap-to-retry)', async () => {
    await defaults.onMutate!(variables, mutationContext);
    await defaults.onError!(new Error('timeout'), variables, undefined, mutationContext);
    const outboxed = useChatOutboxStore.getState().byConversation['conv1']['temp-abc'];
    expect(outboxed._failed).toBe(true);
    expect(outboxed._pending).toBe(false);
  });

  it('onSuccess appends the server message to the cache and clears the outbox entry', async () => {
    queryClient.setQueryData(['chat', 'messages', 'conv1'], { items: [serverMessage('m0')] });
    await defaults.onMutate!(variables, mutationContext);
    await defaults.onSuccess!(serverMessage('m1'), variables, undefined, mutationContext);

    const page = queryClient.getQueryData<{ items: ChatMessage[] }>(['chat', 'messages', 'conv1']);
    expect(page!.items.map((m) => m.id)).toEqual(['m0', 'm1']);
    expect(useChatOutboxStore.getState().byConversation['conv1']['temp-abc']).toBeUndefined();
  });

  it('onSuccess does not duplicate a message the 3s poll already delivered', async () => {
    queryClient.setQueryData(['chat', 'messages', 'conv1'], { items: [serverMessage('m1')] });
    await defaults.onMutate!(variables, mutationContext);
    await defaults.onSuccess!(serverMessage('m1'), variables, undefined, mutationContext);

    const page = queryClient.getQueryData<{ items: ChatMessage[] }>(['chat', 'messages', 'conv1']);
    expect(page!.items).toHaveLength(1);
  });

  it('onSuccess only touches the target conversation cache', async () => {
    queryClient.setQueryData(['chat', 'messages', 'other'], { items: [serverMessage('x')] });
    await defaults.onMutate!(variables, mutationContext);
    await defaults.onSuccess!(serverMessage('m1'), variables, undefined, mutationContext);

    const other = queryClient.getQueryData<{ items: ChatMessage[] }>(['chat', 'messages', 'other']);
    expect(other!.items).toHaveLength(1);
  });

  it('reuses the original client id when retrying an ambiguous failed send', async () => {
    const failed = { ...serverMessage('temp-abc'), _failed: true };
    useChatOutboxStore.getState().add('conv1', failed);
    (api.post as jest.Mock).mockResolvedValue({ data: { data: serverMessage('m1') } });
    const { result } = await renderHook(() => useSendMessage('conv1'), {
      wrapper: QueryWrapper,
    });

    await act(() => result.current.retry(failed));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(api.post).toHaveBeenCalledWith(
      '/chat/conversations/conv1/messages',
      expect.objectContaining({ client_id: 'temp-abc' }),
    );
  });
});
