import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'postervia-query-cache',
});

// MS-16 / P1: only chat message-send mutations get persisted across an app
// kill and auto-resumed on relaunch (via PersistQueryClientProvider's
// resumePausedMutations). Persisting the whole cache would replay unrelated
// in-flight mutations (block user, delete post, ...) on next launch, which
// is surprising and unsafe — see the mutationKey on useSendMessage in
// features/chat/useChat.ts.
export const CHAT_SEND_MUTATION_KEY = 'chat:sendMessage';
