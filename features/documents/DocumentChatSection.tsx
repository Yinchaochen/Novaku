import { useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, TextInput, View } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import { DocumentRecord, useAskDocumentQuestion, useDocumentChat } from './useDocuments';

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { error?: { message?: string } } } }).response;
    const message = response?.data?.error?.message;
    if (message) return message;
  }

  if (error instanceof Error) return error.message;

  return fallback;
}

function formatTimestamp(value: string, langCode: string) {
  try {
    return new Intl.DateTimeFormat(langCode, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function DocumentChatSection({ doc }: { doc: DocumentRecord }) {
  const { t, langCode } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState('');
  const chat = useDocumentChat(doc.id, expanded && doc.processing_status === 'interpreted');
  const ask = useAskDocumentQuestion(doc.id);

  const errorMessage = useMemo(() => {
    if (!ask.isError) return null;
    return getErrorMessage(ask.error, t.common.error);
  }, [ask.error, ask.isError, t.common.error]);

  const submitQuestion = () => {
    const question = draft.trim();
    if (question.length < 2) return;

    ask.mutate(question, {
      onSuccess: () => setDraft(''),
    });
  };

  return (
    <View className="mt-4 rounded-[26px] border border-[#E7EAF7] bg-[#F8FAFF] px-4 py-4">
      <Pressable
        className="flex-row items-center justify-between"
        onPress={() => setExpanded((value) => !value)}
      >
        <View className="flex-1 pr-3">
          <Text className="text-sm font-extrabold text-gray-900">{t.documents.ask_ai}</Text>
          <Text className="mt-1 text-xs leading-5 text-gray-500">{t.documents.ask_ai_hint}</Text>
        </View>
        <Text className="text-xs font-extrabold uppercase tracking-wide text-primary">
          {expanded ? t.documents.conversation_hide : t.documents.conversation_show}
        </Text>
      </Pressable>

      {expanded ? (
        <View className="mt-4">
          {chat.isLoading ? (
            <View className="py-4">
              <ActivityIndicator size="small" color="#FF9F6E" />
            </View>
          ) : chat.data?.length ? (
            <View className="gap-3">
              {chat.data.map((message) => {
                const isAssistant = message.role === 'assistant';
                return (
                  <View
                    key={message.id}
                    className={isAssistant ? 'items-start' : 'items-end'}
                  >
                    <View
                      className={`max-w-[92%] rounded-[24px] px-4 py-3 ${
                        isAssistant ? 'bg-white border border-[#E5EAF8]' : 'bg-primary'
                      }`}
                    >
                      <Text
                        className={`text-[11px] font-extrabold uppercase tracking-wide ${
                          isAssistant ? 'text-primary' : 'text-white/80'
                        }`}
                      >
                        {isAssistant ? t.documents.ai_badge : t.documents.you_badge}
                      </Text>
                      <Text
                        className={`mt-1 text-sm leading-6 ${
                          isAssistant ? 'text-gray-700' : 'text-white'
                        }`}
                      >
                        {message.content}
                      </Text>
                      <Text
                        className={`mt-2 text-[11px] ${
                          isAssistant ? 'text-gray-400' : 'text-white/70'
                        }`}
                      >
                        {formatTimestamp(message.created_at, langCode)}
                      </Text>

                      {isAssistant && message.used_web_search && message.sources.length ? (
                        <View className="mt-3 rounded-[18px] bg-[#F4F7FF] px-3 py-3">
                          <Text className="text-[11px] font-extrabold uppercase tracking-wide text-primary">
                            {t.documents.search_used_badge}
                          </Text>
                          <Text className="mt-2 text-[11px] font-semibold text-gray-500">
                            {t.documents.sources}
                          </Text>
                          <View className="mt-2 gap-2">
                            {message.sources.map((source) => (
                              <Pressable key={`${message.id}-${source.url}`} onPress={() => Linking.openURL(source.url)}>
                                <Text className="text-xs font-semibold text-primary underline">
                                  {source.title}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text className="py-3 text-sm leading-6 text-gray-400">{t.documents.chat_empty}</Text>
          )}

          {errorMessage ? (
            <Text className="mt-3 text-sm text-danger">{errorMessage}</Text>
          ) : null}

          <View className="mt-4 rounded-[22px] border border-[#DDE2F5] bg-white p-3">
            <TextInput
              className="min-h-[88px] px-1 py-1 text-sm text-gray-800"
              placeholder={t.documents.question_placeholder}
              multiline
              textAlignVertical="top"
              value={draft}
              onChangeText={setDraft}
            />
            <View className="mt-3 flex-row items-center justify-between gap-3">
              <Text className="flex-1 text-[11px] leading-5 text-gray-400">
                {t.documents.search_hint}
              </Text>
              <Pressable
                className="rounded-full bg-primary px-4 py-2"
                disabled={ask.isPending}
                onPress={submitQuestion}
              >
                {ask.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-xs font-bold text-white text-center">{t.documents.send_question}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
