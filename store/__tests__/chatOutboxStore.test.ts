import { useChatOutboxStore } from '../chatOutboxStore';
import type { ChatMessage } from '../../features/chat/useChat';

function msg(id: string, over: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id,
    sender: { id: 'me', display_name: 'Me', avatar_url: null },
    type: 'text',
    body: 'hello',
    media_url: null,
    meta: null,
    created_at: '2026-07-03T10:00:00Z',
    _pending: true,
    ...over,
  };
}

describe('chatOutboxStore', () => {
  beforeEach(() => {
    useChatOutboxStore.setState({ byConversation: {} });
  });

  it('add stores the message under conversation → clientId', () => {
    useChatOutboxStore.getState().add('conv1', msg('temp-1'));
    expect(useChatOutboxStore.getState().byConversation['conv1']['temp-1'].body).toBe('hello');
  });

  it('add keeps messages from different conversations separate', () => {
    const { add } = useChatOutboxStore.getState();
    add('conv1', msg('temp-1'));
    add('conv2', msg('temp-2'));
    const state = useChatOutboxStore.getState().byConversation;
    expect(Object.keys(state['conv1'])).toEqual(['temp-1']);
    expect(Object.keys(state['conv2'])).toEqual(['temp-2']);
  });

  it('markFailed flips _pending→false and _failed→true', () => {
    const { add, markFailed } = useChatOutboxStore.getState();
    add('conv1', msg('temp-1'));
    markFailed('conv1', 'temp-1');
    const stored = useChatOutboxStore.getState().byConversation['conv1']['temp-1'];
    expect(stored._pending).toBe(false);
    expect(stored._failed).toBe(true);
  });

  it('markFailed on an unknown clientId is a no-op', () => {
    const before = useChatOutboxStore.getState().byConversation;
    useChatOutboxStore.getState().markFailed('conv1', 'nope');
    expect(useChatOutboxStore.getState().byConversation).toBe(before);
  });

  it('remove drops only the target message', () => {
    const { add, remove } = useChatOutboxStore.getState();
    add('conv1', msg('temp-1'));
    add('conv1', msg('temp-2'));
    remove('conv1', 'temp-1');
    const conv = useChatOutboxStore.getState().byConversation['conv1'];
    expect(conv['temp-1']).toBeUndefined();
    expect(conv['temp-2']).toBeDefined();
  });

  it('remove on an unknown conversation is a no-op', () => {
    const before = useChatOutboxStore.getState().byConversation;
    useChatOutboxStore.getState().remove('ghost', 'temp-1');
    expect(useChatOutboxStore.getState().byConversation).toBe(before);
  });
});
