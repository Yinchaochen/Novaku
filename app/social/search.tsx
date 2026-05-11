import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLanguage } from '../../context/LanguageContext';
import { useChatSearch, useConversations, type ChatSearchHit } from '../../features/chat/useChat';
import {
  useSearchSocialUsers,
  useSocialOverview,
  type SocialFriendship,
  type SocialGroupSummary,
  type SocialSearchResult,
} from '../../features/social/useSocial';
import { resolveMediaUrl } from '../../lib/media';
import { useSearchIntentStore } from '../../store/searchIntentStore';

const HIGHLIGHT_COLOR = '#2F80ED';
const SEARCH_DEBOUNCE_MS = 200;

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function HighlightedText({
  text,
  query,
  className,
  numberOfLines,
}: {
  text: string;
  query: string;
  className?: string;
  numberOfLines?: number;
}) {
  const trimmed = query.trim();
  if (!trimmed) {
    return (
      <Text className={className} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }
  const lowerText = text.toLowerCase();
  const lowerQuery = trimmed.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);
  if (index === -1) {
    return (
      <Text className={className} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }
  return (
    <Text className={className} numberOfLines={numberOfLines}>
      {text.slice(0, index)}
      <Text style={{ color: HIGHLIGHT_COLOR, fontWeight: '700' }}>
        {text.slice(index, index + trimmed.length)}
      </Text>
      {text.slice(index + trimmed.length)}
    </Text>
  );
}

function Avatar({ url, fallback, size = 40 }: { url?: string | null; fallback: string; size?: number }) {
  const resolved = resolveMediaUrl(url);
  if (resolved) {
    return (
      <Image
        source={resolved}
        contentFit="cover"
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      className="items-center justify-center rounded-full"
      style={{ width: size, height: size, backgroundColor: '#FFE6EA' }}
    >
      <Text style={{ color: '#F47C7C', fontSize: size * 0.4, fontWeight: '700' }}>
        {fallback.trim().slice(0, 1).toUpperCase() || '?'}
      </Text>
    </View>
  );
}

function SectionHeader({
  title,
  showMore,
  onShowMore,
  moreLabel,
}: {
  title: string;
  showMore?: boolean;
  onShowMore?: () => void;
  moreLabel?: string;
}) {
  return (
    <View className="flex-row items-center justify-between px-4 pb-2 pt-4">
      <Text className="text-[13px] font-semibold text-neutral-500">{title}</Text>
      {showMore && onShowMore ? (
        <Pressable onPress={onShowMore} hitSlop={6}>
          <Text className="text-[13px] font-medium text-[#2F80ED]">
            {moreLabel ?? 'More'} ›
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function previewBody(message: ChatSearchHit['message']) {
  if (message.type === 'text' && message.body) return message.body;
  if (message.type === 'image') return '[Photo]';
  if (message.type === 'voice') return '[Voice]';
  if (message.type === 'memo') return '[Memo]';
  if (message.type === 'sticker') return '[Sticker]';
  return message.body ?? '';
}

function formatHitDate(value: string, langCode: string) {
  try {
    return new Intl.DateTimeFormat(langCode, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function SocialSearchScreen() {
  const { t, langCode } = useLanguage();
  const [rawQuery, setRawQuery] = useState('');
  const debouncedQuery = useDebouncedValue(rawQuery, SEARCH_DEBOUNCE_MS);
  const inputRef = useRef<TextInput>(null);
  const [expanded, setExpanded] = useState<{ people: boolean; contacts: boolean; groups: boolean; messages: boolean }>({
    people: false,
    contacts: false,
    groups: false,
    messages: false,
  });

  // Reset expansion whenever the query changes — collapsed by default each new search.
  useEffect(() => {
    setExpanded({ people: false, contacts: false, groups: false, messages: false });
  }, [debouncedQuery]);

  const overview = useSocialOverview();
  const conversationsQuery = useConversations();
  const messageSearch = useChatSearch(debouncedQuery, debouncedQuery.trim().length > 0);
  const peopleSearch = useSearchSocialUsers(debouncedQuery, debouncedQuery.trim().length >= 2);

  const setOpenIntent = useSearchIntentStore((s) => s.setOpenIntent);

  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(id);
  }, []);

  const friends: SocialFriendship[] = overview.data?.friends ?? [];
  const groups: SocialGroupSummary[] = overview.data?.groups ?? [];

  const trimmed = debouncedQuery.trim().toLowerCase();
  const hasQuery = trimmed.length > 0;

  const contactHits = useMemo(() => {
    if (!hasQuery) return [];
    return friends
      .filter((f) => f.status === 'accepted')
      .filter((f) => {
        const fields = [f.user.display_name, f.user.city].filter(Boolean) as string[];
        return fields.some((s) => s.toLowerCase().includes(trimmed));
      });
  }, [friends, trimmed, hasQuery]);

  const groupHits = useMemo(() => {
    if (!hasQuery) return [];
    return groups.filter((g) => {
      const fields = [g.name, g.description ?? '', ...g.members.map((m) => m.user.display_name)];
      return fields.some((s) => s.toLowerCase().includes(trimmed));
    });
  }, [groups, trimmed, hasQuery]);

  const messageHits = messageSearch.data?.items ?? [];
  const peopleHits: SocialSearchResult[] = peopleSearch.data ?? [];

  const totalHits = peopleHits.length + contactHits.length + groupHits.length + messageHits.length;
  const isLoadingMessages = hasQuery && messageSearch.isLoading;
  const isLoadingPeople = hasQuery && peopleSearch.isFetching;

  const goBack = () => router.back();

  const openDirect = async (friendUserId: string) => {
    try {
      const { api } = await import('../../lib/api');
      const res = await api.get(`/chat/conversations/direct/${friendUserId}`);
      const conversationId = res.data.data.id as string;
      setOpenIntent({ conversationId });
      goBack();
    } catch {
      // best-effort: at least pop back so the user isn't stuck
      goBack();
    }
  };

  const openGroup = async (groupId: string) => {
    try {
      const { api } = await import('../../lib/api');
      const res = await api.get(`/chat/conversations/group/${groupId}`);
      const conversationId = res.data.data.id as string;
      setOpenIntent({ conversationId });
      goBack();
    } catch {
      goBack();
    }
  };

  const openMessageHit = (hit: ChatSearchHit) => {
    setOpenIntent({
      conversationId: hit.conversation_id,
      scrollToMessageId: hit.message.id,
    });
    goBack();
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-row items-center gap-3 border-b border-neutral-100 px-4 py-3">
          <View className="flex-1 flex-row items-center rounded-2xl bg-[#F5F5F7] px-3">
            <Ionicons name="search" size={18} color="#9CA3AF" />
            <TextInput
              ref={inputRef}
              value={rawQuery}
              onChangeText={setRawQuery}
              placeholder={t.social.messages_search_placeholder}
              placeholderTextColor="#9CA3AF"
              className="flex-1 px-2 py-2 text-[15px] text-black"
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {rawQuery ? (
              <Pressable onPress={() => setRawQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </Pressable>
            ) : null}
          </View>
          <Pressable onPress={goBack} hitSlop={6}>
            <Text className="text-[15px] font-medium text-[#2F80ED]">{t.social.messages_search_cancel}</Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          {!hasQuery ? (
            <View className="items-center pt-24">
              <Text className="text-[14px] text-neutral-400">{t.social.messages_search_hint}</Text>
            </View>
          ) : totalHits === 0 && !isLoadingMessages && !isLoadingPeople ? (
            <View className="items-center pt-20">
              <Text className="text-[15px] font-semibold text-neutral-700">
                {t.social.messages_search_no_results_title}
              </Text>
              <Text className="mt-2 px-8 text-center text-[13px] text-neutral-400">
                {t.social.messages_search_no_results_description}
              </Text>
              <Text className="mt-3 px-8 text-center text-[12px] text-neutral-400">
                {t.social.search_id_hint}
              </Text>
            </View>
          ) : (
            <>
              {peopleHits.length > 0 || isLoadingPeople ? (
                <>
                  <SectionHeader
                    title={t.social.search_section_people}
                    showMore={!expanded.people && peopleHits.length > 5}
                    moreLabel={t.social.messages_search_more}
                    onShowMore={() => setExpanded((s) => ({ ...s, people: true }))}
                  />
                  {isLoadingPeople ? (
                    <View className="items-center py-6">
                      <ActivityIndicator size="small" color="#F47C7C" />
                    </View>
                  ) : (
                    (expanded.people ? peopleHits : peopleHits.slice(0, 5)).map((hit) => (
                      <Pressable
                        key={hit.id}
                        onPress={() => router.push({ pathname: '/users/[id]', params: { id: hit.id } })}
                        className="flex-row items-center gap-3 px-4 py-3 active:bg-neutral-50"
                      >
                        <Avatar url={hit.avatar_url} fallback={hit.display_name} />
                        <View className="flex-1">
                          <HighlightedText
                            text={hit.display_name}
                            query={debouncedQuery}
                            className="text-[15px] font-semibold text-black"
                            numberOfLines={1}
                          />
                          <Text numberOfLines={1} className="mt-0.5 text-[12px] text-neutral-500">
                            {[hit.city, hit.identity].filter(Boolean).join(' · ')}
                          </Text>
                        </View>
                        <Text className="ml-2 text-[11px] font-medium text-neutral-400">
                          #{hit.display_id}
                        </Text>
                      </Pressable>
                    ))
                  )}
                </>
              ) : null}

              {contactHits.length > 0 ? (
                <>
                  <SectionHeader
                    title={t.social.messages_search_contacts}
                    showMore={!expanded.contacts && contactHits.length > 3}
                    moreLabel={t.social.messages_search_more}
                    onShowMore={() => setExpanded((s) => ({ ...s, contacts: true }))}
                  />
                  {(expanded.contacts ? contactHits : contactHits.slice(0, 3)).map((hit) => (
                    <Pressable
                      key={hit.id}
                      onPress={() => void openDirect(hit.user.id)}
                      className="flex-row items-center gap-3 px-4 py-3 active:bg-neutral-50"
                    >
                      <Avatar url={hit.user.avatar_url} fallback={hit.user.display_name} />
                      <View className="flex-1">
                        <HighlightedText
                          text={hit.user.display_name}
                          query={debouncedQuery}
                          className="text-[15px] font-semibold text-black"
                          numberOfLines={1}
                        />
                        {hit.user.city ? (
                          <Text numberOfLines={1} className="mt-0.5 text-[12px] text-neutral-500">
                            {hit.user.city}
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  ))}
                </>
              ) : null}

              {groupHits.length > 0 ? (
                <>
                  <SectionHeader
                    title={t.social.messages_search_groups}
                    showMore={!expanded.groups && groupHits.length > 3}
                    moreLabel={t.social.messages_search_more}
                    onShowMore={() => setExpanded((s) => ({ ...s, groups: true }))}
                  />
                  {(expanded.groups ? groupHits : groupHits.slice(0, 3)).map((group) => (
                    <Pressable
                      key={group.id}
                      onPress={() => void openGroup(group.id)}
                      className="flex-row items-center gap-3 px-4 py-3 active:bg-neutral-50"
                    >
                      <Avatar url={group.members[0]?.user.avatar_url ?? null} fallback={group.name} />
                      <View className="flex-1">
                        <HighlightedText
                          text={group.name}
                          query={debouncedQuery}
                          className="text-[15px] font-semibold text-black"
                          numberOfLines={1}
                        />
                        <Text numberOfLines={1} className="mt-0.5 text-[12px] text-neutral-500">
                          {group.member_count} {t.social.group_members}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </>
              ) : null}

              {messageHits.length > 0 || isLoadingMessages ? (
                <>
                  <SectionHeader
                    title={t.social.messages_search_history}
                    showMore={!expanded.messages && messageHits.length > 5}
                    moreLabel={t.social.messages_search_more}
                    onShowMore={() => setExpanded((s) => ({ ...s, messages: true }))}
                  />
                  {isLoadingMessages ? (
                    <View className="items-center py-6">
                      <ActivityIndicator size="small" color="#F47C7C" />
                    </View>
                  ) : (
                    (expanded.messages ? messageHits : messageHits.slice(0, 5)).map((hit) => (
                      <Pressable
                        key={hit.message.id}
                        onPress={() => openMessageHit(hit)}
                        className="flex-row items-start gap-3 px-4 py-3 active:bg-neutral-50"
                      >
                        <Avatar
                          url={hit.conversation_avatar_url ?? hit.message.sender.avatar_url}
                          fallback={hit.conversation_title ?? hit.message.sender.display_name}
                        />
                        <View className="flex-1">
                          <View className="flex-row items-center justify-between">
                            <Text numberOfLines={1} className="text-[15px] font-semibold text-black">
                              {hit.conversation_title ?? hit.message.sender.display_name}
                            </Text>
                            <Text className="ml-2 text-[11px] text-neutral-400">
                              {formatHitDate(hit.message.created_at, langCode)}
                            </Text>
                          </View>
                          <HighlightedText
                            text={previewBody(hit.message)}
                            query={debouncedQuery}
                            className="mt-1 text-[13px] leading-5 text-neutral-600"
                            numberOfLines={2}
                          />
                        </View>
                      </Pressable>
                    ))
                  )}
                </>
              ) : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
