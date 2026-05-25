import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBackground } from '../../components/AppBackground';
import { ChalkIcon } from '../../components/ChalkIcon';
import { DateTimeRangePicker } from '../../components/datetime/DateTimeRangePicker';
import { PlacePicker, type PickedPlace } from '../../components/places/PlacePicker';
import { useLanguage } from '../../context/LanguageContext';
import { useAuthStore } from '../../store/authStore';
import { colors, shadows } from '../../theme/tokens';
import { formatDisplayLocation } from '../../lib/displayLocation';
import { resolveMediaUrl } from '../../lib/media';
import { reportToSentry } from '../../lib/sentry';
import {
  SocialFriendship,
  SocialGroupEvent,
  SocialGroupSummary,
  useAcceptFriendRequest,
  useAddSocialEventToOdyssey,
  useCreateSocialGroup,
  useCreateSocialGroupEvent,
  useDeclineFriendRequest,
  useSearchSocialUsers,
  useSocialGroupDetail,
  useSocialOverview,
} from '../../features/social/useSocial';
import {
  ChatConversation,
  ChatMessage,
  useConversations,
  useChatMessages,
  useSendMessage,
  useMarkRead,
  useUploadChatMedia,
  useUploadStickerMedia,
  useStickers,
  useSaveSticker,
  useDeleteMessage,
  useEditMessage,
  useConversationFavorites,
  useFavoriteMessage,
  useUnfavoriteMessage,
} from '../../features/chat/useChat';
import { MessageActionMenu, MenuAction } from '../../components/MessageActionMenu';
import { useNotifications } from '../../features/community/useCommunity';
import { api } from '../../lib/api';
import { useSearchIntentStore } from '../../store/searchIntentStore';

type ConversationKind = 'self' | 'direct' | 'group';

type ConversationItem = {
  id: string;
  kind: ConversationKind;
  title: string;
  subtitle: string;
  timestamp: string | null;
  unreadCount: number;
  avatarUrls: string[];
  friend?: SocialFriendship;
  group?: SocialGroupSummary;
  // resolved backend conversation id once fetched
  conversationId?: string | null;
  // payload needed to fetch conversation
  friendUserId?: string;
  groupId?: string;
};

const COMMON_EMOJI = [
  '😀','😂','😍','🥰','😎','🤔','😅','😭',
  '🥺','😤','🤩','😏','😴','🤗','😬','🙃',
  '👍','👎','👋','🙌','🤝','❤️','🔥','✨',
  '🎉','🎊','💯','⭐','🌟','🍕','🍜','☕',
  '🐶','🐱','🦋','🌸','🌈','🏖️','🎵','🚀',
  '😆','😜','🤪','😱','😰','🤭','🫡','🫶',
];

function formatConversationTime(value: string | null | undefined, langCode: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const sameDay =
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate();
  try {
    if (sameDay) {
      return new Intl.DateTimeFormat(langCode, { hour: '2-digit', minute: '2-digit' }).format(date);
    }
    return new Intl.DateTimeFormat(langCode, { month: '2-digit', day: '2-digit' }).format(date);
  } catch {
    return '';
  }
}

function formatEventLine(event: SocialGroupEvent, langCode: string) {
  try {
    const parts = [
      new Intl.DateTimeFormat(langCode, { month: 'short', day: 'numeric' }).format(new Date(event.starts_at)),
      new Intl.DateTimeFormat(langCode, { hour: '2-digit', minute: '2-digit' }).format(new Date(event.starts_at)),
    ];
    return parts.join(' · ');
  } catch {
    return event.starts_at;
  }
}

function AvatarFallback({ size, label, tint }: { size: number; label: string; tint: string }) {
  return (
    <View
      className="items-center justify-center rounded-full"
      style={{ width: size, height: size, backgroundColor: tint }}
    >
      <Text style={{ color: '#1F2937', fontSize: Math.max(12, size * 0.38), fontWeight: '800' }}>
        {label.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}

function SingleAvatar({ uri, size, label, tint }: { uri?: string | null; size: number; label: string; tint: string }) {
  if (!uri) return <AvatarFallback size={size} label={label} tint={tint} />;
  return (
    <Image
      source={uri}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tint }}
      contentFit="cover"
      transition={120}
    />
  );
}

function ConversationAvatar({ item }: { item: ConversationItem }) {
  if (item.kind !== 'group') {
    return (
      <SingleAvatar
        uri={item.avatarUrls[0]}
        size={56}
        label={item.title}
        tint={item.kind === 'self' ? '#DCE8FF' : '#F4E3FF'}
      />
    );
  }
  const first = item.avatarUrls[0];
  const second = item.avatarUrls[1];
  return (
    <View style={{ width: 56, height: 56 }}>
      <View style={styles.groupAvatarBack}>
        <SingleAvatar uri={second} size={34} label={item.title} tint="#FDE9D9" />
      </View>
      <View style={styles.groupAvatarFront}>
        <SingleAvatar uri={first} size={38} label={item.title} tint="#DCE8FF" />
      </View>
    </View>
  );
}

function ConversationRow({ item, langCode, onPress }: { item: ConversationItem; langCode: string; onPress: () => void }) {
  const timeLabel = formatConversationTime(item.timestamp, langCode);
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-5 py-4"
      style={({ pressed }) => ({ opacity: pressed ? 0.84 : 1 })}
    >
      <ConversationAvatar item={item} />
      <View className="ml-4 flex-1">
        <View className="flex-row items-start justify-between">
          <Text className="flex-1 pr-4 text-[19px] font-semibold text-slate-900" numberOfLines={1}>
            {item.title}
          </Text>
          {timeLabel ? <Text className="text-xs text-slate-400">{timeLabel}</Text> : null}
        </View>
        <Text className="mt-1 text-[14px] leading-5 text-slate-500" numberOfLines={2}>
          {item.subtitle}
        </Text>
      </View>
      {item.unreadCount > 0 ? (
        <View className="ml-3 min-w-[22px] rounded-full bg-[#FF5A57] px-1.5 py-1">
          <Text className="text-center text-[11px] font-extrabold text-white">{item.unreadCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text className="px-5 pb-2 pt-2 text-xs font-bold uppercase tracking-[1.3px] text-slate-400">{children}</Text>;
}

// Renders a single message bubble
function MessageBubble({
  message,
  isMe,
  userAvatar,
  userDisplayName,
  onImagePress,
  onLongPress,
  editedLabel,
  deletedLabel,
  isMultiSelect = false,
  isSelected = false,
  isFavorited = false,
  highlighted = false,
  onSelect,
  onReplyPress,
}: {
  message: ChatMessage;
  isMe: boolean;
  userAvatar: string | null;
  userDisplayName: string;
  onImagePress: (url: string) => void;
  onLongPress: (message: ChatMessage, isMe: boolean, pageY: number, pageX: number) => void;
  editedLabel: string;
  deletedLabel: string;
  isMultiSelect?: boolean;
  isSelected?: boolean;
  isFavorited?: boolean;
  highlighted?: boolean;
  onSelect?: (id: string) => void;
  onReplyPress?: (originalId: string) => void;
}) {
  const senderAvatar = isMe ? userAvatar : resolveMediaUrl(message.sender.avatar_url) ?? null;
  const senderName = isMe ? userDisplayName : message.sender.display_name;
  const senderTint = isMe ? '#D6DBF2' : '#F4E3FF';

  const resolvedMediaUrl = message.media_url ? (resolveMediaUrl(message.media_url) ?? message.media_url) : null;

  const replyOriginalId = message.meta?.reply_to_id ? String(message.meta.reply_to_id) : null;
  const quotedPreview = replyOriginalId ? (
    <Pressable
      onPress={() => !isMultiSelect && onReplyPress?.(replyOriginalId)}
      style={{
        backgroundColor: isMe ? 'rgba(0,0,0,0.15)' : '#F0F2F8',
        borderRadius: 10,
        borderLeftWidth: 3,
        borderLeftColor: isMe ? 'rgba(255,255,255,0.55)' : '#FF9F6E',
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginBottom: 6,
      }}
    >
      <Text style={{ color: isMe ? 'rgba(255,255,255,0.85)' : '#FF9F6E', fontWeight: '600', fontSize: 11 }} numberOfLines={1}>
        {String(message.meta?.reply_to_sender_name ?? '')}
      </Text>
      <Text style={{ color: isMe ? 'rgba(255,255,255,0.65)' : '#6B7280', fontSize: 11 }} numberOfLines={1}>
        {String(message.meta?.reply_to_body || '[media]')}
      </Text>
    </Pressable>
  ) : null;

  const bubbleContent = () => {
    if (message.type === 'deleted') {
      return (
        <View style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
          <Text style={{ color: '#9CA3AF', fontSize: 14, fontStyle: 'italic' }}>{deletedLabel}</Text>
        </View>
      );
    }
    if (message.type === 'image' && resolvedMediaUrl) {
      return (
        <View>
          {quotedPreview}
          <Pressable
            onPress={() => !isMultiSelect && onImagePress(resolvedMediaUrl)}
            onLongPress={(e) => !isMultiSelect && onLongPress(message, isMe, e.nativeEvent.pageY, e.nativeEvent.pageX)}
            delayLongPress={400}
          >
            <Image source={resolvedMediaUrl} style={{ width: 220, height: 160, borderRadius: 16 }} contentFit="cover" />
          </Pressable>
        </View>
      );
    }
    if (message.type === 'sticker' && resolvedMediaUrl) {
      return (
        <View>
          {quotedPreview}
          <Pressable onLongPress={(e) => !isMultiSelect && onLongPress(message, isMe, e.nativeEvent.pageY, e.nativeEvent.pageX)} delayLongPress={400}>
            <Image source={resolvedMediaUrl} style={{ width: 120, height: 120 }} contentFit="contain" />
          </Pressable>
        </View>
      );
    }
    if (message.type === 'voice') {
      return (
        <Pressable
          onLongPress={(e) => !isMultiSelect && onLongPress(message, isMe, e.nativeEvent.pageY, e.nativeEvent.pageX)}
          delayLongPress={400}
          style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 }}
        >
          <Ionicons name="mic-outline" size={18} color={isMe ? '#FFFFFF' : '#374151'} />
          <Text style={{ marginLeft: 6, color: isMe ? '#FFFFFF' : '#374151', fontSize: 14 }}>
            Voice message
          </Text>
        </Pressable>
      );
    }
    if (message.type === 'memo') {
      return (
        <Pressable
          onLongPress={(e) => !isMultiSelect && onLongPress(message, isMe, e.nativeEvent.pageY, e.nativeEvent.pageX)}
          delayLongPress={400}
          style={{
            backgroundColor: '#FFFBE6',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#F5E9A0',
            paddingHorizontal: 14,
            paddingVertical: 10,
            maxWidth: 240,
          }}
        >
          {quotedPreview}
          <Text style={{ color: '#374151', fontSize: 14, lineHeight: 22 }}>{message.body ?? ''}</Text>
        </Pressable>
      );
    }
    // text
    return (
      <Pressable
        onLongPress={(e) => !isMultiSelect && onLongPress(message, isMe, e.nativeEvent.pageY, e.nativeEvent.pageX)}
        delayLongPress={400}
        android_ripple={{ color: 'rgba(0,0,0,0.08)', borderless: false }}
        style={{
          maxWidth: '100%',
          backgroundColor: isMe ? colors.brandCoral : '#FFFFFF',
          borderRadius: 20,
          borderBottomRightRadius: isMe ? 5 : 20,
          borderBottomLeftRadius: isMe ? 20 : 5,
          paddingHorizontal: 14,
          paddingVertical: 10,
          shadowColor: '#000',
          shadowOpacity: isMe ? 0 : 0.05,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 1 },
          elevation: isMe ? 0 : 1,
        }}
      >
        {quotedPreview}
        <Text style={{ color: isMe ? '#FFFFFF' : '#1F2937', fontSize: 15, lineHeight: 22 }}>
          {message.body ?? ''}
        </Text>
        {message.meta?.edited || isFavorited ? (
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 3, gap: 4 }}>
            {isFavorited ? <Ionicons name="star" size={10} color={isMe ? 'rgba(255,235,59,0.9)' : '#F59E0B'} /> : null}
            {message.meta?.edited ? (
              <Text style={{ color: isMe ? 'rgba(255,255,255,0.55)' : '#9CA3AF', fontSize: 11 }}>
                {editedLabel}
              </Text>
            ) : null}
          </View>
        ) : null}
      </Pressable>
    );
  };

  const isMedia = message.type === 'image' || message.type === 'sticker';

  if (isMultiSelect) {
    return (
      <Pressable
        onPress={() => onSelect?.(message.id)}
        style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 6 }}
      >
        <View style={{ width: 34, alignItems: 'center', paddingBottom: 2 }}>
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              borderWidth: 2,
              borderColor: isSelected ? '#FF9F6E' : '#C4C9D8',
              backgroundColor: isSelected ? '#FF9F6E' : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isSelected ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
          </View>
        </View>
        {!isMe ? (
          <View style={{ marginRight: 8 }}>
            <SingleAvatar uri={senderAvatar} size={36} label={senderName} tint={senderTint} />
          </View>
        ) : null}
        <View style={{ maxWidth: isMedia ? undefined : '72%' }}>{bubbleContent()}</View>
        {isMe ? (
          <View style={{ marginLeft: 8 }}>
            <SingleAvatar uri={senderAvatar} size={36} label={senderName} tint={senderTint} />
          </View>
        ) : null}
      </Pressable>
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: isMe ? 'flex-end' : 'flex-start',
        alignItems: 'flex-end',
        marginBottom: 6,
        paddingHorizontal: highlighted ? 8 : 0,
        paddingVertical: highlighted ? 6 : 0,
        backgroundColor: highlighted ? 'rgba(255, 224, 130, 0.45)' : 'transparent',
        borderRadius: highlighted ? 14 : 0,
      }}
    >
      {!isMe ? (
        <View style={{ marginRight: 8 }}>
          <SingleAvatar uri={senderAvatar} size={36} label={senderName} tint={senderTint} />
        </View>
      ) : null}
      <View style={{ maxWidth: isMedia ? undefined : '72%' }}>{bubbleContent()}</View>
      {isMe ? (
        <View style={{ marginLeft: 8 }}>
          <SingleAvatar uri={senderAvatar} size={36} label={senderName} tint={senderTint} />
        </View>
      ) : null}
    </View>
  );
}

export default function SocialScreen() {
  const { t, langCode } = useLanguage();
  const insets = useSafeAreaInsets();
  const chatBottomInset = Math.max(insets.bottom, 8);
  const user = useAuthStore((state) => state.user);
  const socialQuery = useSocialOverview();
  const [conversationOrigin, setConversationOrigin] = useState<'social' | 'buddy_post'>('social');
  const conversationsQuery = useConversations(conversationOrigin);
  const acceptFriendRequest = useAcceptFriendRequest();
  const declineFriendRequest = useDeclineFriendRequest();
  const createGroup = useCreateSocialGroup();
  const addSocialEventToOdyssey = useAddSocialEventToOdyssey();

  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isConnectionsVisible, setIsConnectionsVisible] = useState(false);
  const [isCreateGroupVisible, setIsCreateGroupVisible] = useState(false);
  const [isConversationVisible, setIsConversationVisible] = useState(false);
  const [isCreateMeetupVisible, setIsCreateMeetupVisible] = useState(false);
  const [isPlusVisible, setIsPlusVisible] = useState(false);
  const [isEmojiVisible, setIsEmojiVisible] = useState(false);
  const [emojiTab, setEmojiTab] = useState<'emoji' | 'stickers'>('emoji');

  // Conversation search lives in /social/search now; the inline list is unfiltered.
  const [peopleSearch, setPeopleSearch] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<ConversationItem | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [draftMessage, setDraftMessage] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [eventTitle, setEventTitle] = useState('');
  const [eventPlace, setEventPlace] = useState<PickedPlace | null>(null);
  const [eventTimeRange, setEventTimeRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingSticker, setUploadingSticker] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; message: ChatMessage | null; isMe: boolean; pageY: number; pageX: number }>({ visible: false, message: null, isMe: false, pageY: 0, pageX: 0 });
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState<Set<string>>(new Set());
  const [isForwardVisible, setIsForwardVisible] = useState(false);
  const [forwardMessage, setForwardMessage] = useState<ChatMessage | null>(null);

  const messagesListRef = useRef<FlatList>(null);

  const searchUsersQuery = useSearchSocialUsers(peopleSearch, isConnectionsVisible);
  const stickersQuery = useStickers();

  const [scrollToMessageId, setScrollToMessageId] = useState<string | null>(null);
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null);
  const messagesQuery = useChatMessages(activeConversationId, { atMessageId: scrollToMessageId });
  const notificationsQuery = useNotifications(true, 'social');
  const sendMessage = useSendMessage(activeConversationId ?? '');
  const markRead = useMarkRead();
  const uploadMedia = useUploadChatMedia(activeConversationId ?? '');
  const deleteMessage = useDeleteMessage(activeConversationId ?? '');
  const uploadStickerMedia = useUploadStickerMedia();
  const saveSticker = useSaveSticker();
  const editMessage = useEditMessage(activeConversationId ?? '');
  const favoriteMessage = useFavoriteMessage();
  const unfavoriteMessage = useUnfavoriteMessage();
  const conversationFavoritesQuery = useConversationFavorites(activeConversationId);
  const favoritedIds = new Set<string>(conversationFavoritesQuery.data ?? []);

  const friends = socialQuery.data?.friends ?? [];
  const incomingRequests = socialQuery.data?.incoming_requests ?? [];
  const outgoingRequests = socialQuery.data?.outgoing_requests ?? [];
  const groups = socialQuery.data?.groups ?? [];

  const selectedGroupId = selectedConversation?.kind === 'group' ? selectedConversation.group?.id ?? null : null;
  const groupDetailQuery = useSocialGroupDetail(
    selectedGroupId,
    isConversationVisible && Boolean(selectedGroupId),
  );
  const createGroupEvent = useCreateSocialGroupEvent(selectedGroupId);

  const userAvatar = resolveMediaUrl(user?.avatar_url) ?? null;

  const lastMessagePreview = (msg: ChatConversation['last_message']): string => {
    if (!msg) return '';
    if (msg.type === 'image') return t.chat.preview_image;
    if (msg.type === 'voice') return t.chat.preview_voice;
    if (msg.type === 'sticker') return t.chat.preview_sticker;
    if (msg.type === 'memo') return t.chat.preview_memo;
    return msg.body ?? '';
  };

  // Build a map from backend conversation data for subtitle/timestamp/unread enrichment
  const backendConvMap = useMemo<Record<string, ChatConversation>>(() => {
    const map: Record<string, ChatConversation> = {};
    for (const conv of conversationsQuery.data ?? []) {
      map[conv.id] = conv;
      // Index by other_user_id and group_id for easy lookup
      if (conv.other_user_id) map[`direct:${conv.other_user_id}`] = conv;
      if (conv.group_id) map[`group:${conv.group_id}`] = conv;
      if (conv.type === 'self') map['self'] = conv;
    }
    return map;
  }, [conversationsQuery.data]);

  const selfConversation = useMemo<ConversationItem>(() => {
    const bc = backendConvMap['self'];
    const preview = bc?.last_message ? lastMessagePreview(bc.last_message) : t.social.self_chat_subtitle;
    return {
      id: 'self',
      kind: 'self',
      title: user?.display_name ?? t.social.self_chat_title,
      subtitle: preview,
      timestamp: bc?.updated_at ?? null,
      unreadCount: bc?.unread_count ?? 0,
      avatarUrls: userAvatar ? [userAvatar] : [],
      conversationId: bc?.id ?? null,
    };
  }, [backendConvMap, user?.display_name, userAvatar, t.social.self_chat_title, t.social.self_chat_subtitle, t.chat]);

  const directConversations = useMemo<ConversationItem[]>(() => {
    return friends.map((friendship) => {
      const bc = backendConvMap[`direct:${friendship.user.id}`];
      const cityLabel = formatDisplayLocation(friendship.user.city) ?? friendship.user.city;
      const preview = bc?.last_message ? lastMessagePreview(bc.last_message) : cityLabel;
      return {
        id: `friend-${friendship.user.id}`,
        kind: 'direct',
        title: friendship.user.display_name,
        subtitle: preview,
        timestamp: bc?.updated_at ?? friendship.responded_at ?? friendship.created_at,
        unreadCount: bc?.unread_count ?? 0,
        avatarUrls: [resolveMediaUrl(friendship.user.avatar_url) ?? ''],
        friend: friendship,
        conversationId: bc?.id ?? null,
        friendUserId: friendship.user.id,
      };
    });
  }, [friends, backendConvMap, t.chat]);

  const groupConversations = useMemo<ConversationItem[]>(() => {
    return groups.map((group) => {
      const bc = backendConvMap[`group:${group.id}`];
      const memberAvatars = group.members
        .slice(0, 2)
        .map((member) => resolveMediaUrl(member.user.avatar_url) ?? '')
        .filter(Boolean);
      const preview = bc?.last_message
        ? lastMessagePreview(bc.last_message)
        : (group.description ?? `${group.member_count} ${t.social.group_members} · ${formatDisplayLocation(group.city) ?? group.city}`);
      return {
        id: `group-${group.id}`,
        kind: 'group',
        title: group.name,
        subtitle: preview,
        timestamp: bc?.updated_at ?? group.next_event_at ?? null,
        unreadCount: bc?.unread_count ?? 0,
        avatarUrls: memberAvatars,
        group,
        conversationId: bc?.id ?? null,
        groupId: group.id,
      };
    });
  }, [groups, backendConvMap, t.social.group_members]);

  // Buddy-origin conversations come straight from the backend (origin_type='buddy_post'),
  // not derived from the friends list. These are 1-on-1 chats started by tapping
  // "联系 ta" on a buddy post — no friending required.
  const buddyConversations = useMemo<ConversationItem[]>(() => {
    if (conversationOrigin !== 'buddy_post') return [];
    return (conversationsQuery.data ?? [])
      .filter((conv) => conv.type === 'direct' && conv.origin_type === 'buddy_post')
      .map((conv) => ({
        id: `buddy-${conv.id}`,
        kind: 'direct' as const,
        title: conv.other_user_name ?? '',
        subtitle: conv.last_message ? lastMessagePreview(conv.last_message) : '',
        timestamp: conv.updated_at,
        unreadCount: conv.unread_count,
        avatarUrls: [resolveMediaUrl(conv.other_user_avatar) ?? ''],
        conversationId: conv.id,
        friendUserId: conv.other_user_id ?? undefined,
      }));
  }, [conversationOrigin, conversationsQuery.data, t.chat]);

  const conversations = useMemo<ConversationItem[]>(() => {
    if (conversationOrigin === 'buddy_post') {
      return buddyConversations;
    }
    return [selfConversation, ...directConversations, ...groupConversations];
  }, [conversationOrigin, buddyConversations, directConversations, groupConversations, selfConversation]);

  const messages = messagesQuery.data?.items ?? [];

  // Scroll to the search-targeted message and flash highlight for 1s.
  useEffect(() => {
    if (!scrollToMessageId || messages.length === 0) return;
    const targetIndex = messages.findIndex((m) => m.id === scrollToMessageId);
    if (targetIndex === -1) return;
    const scrollTimer = setTimeout(() => {
      try {
        messagesListRef.current?.scrollToIndex({ index: targetIndex, animated: true, viewPosition: 0.5 });
      } catch {
        // FlatList scrollToIndex can throw on layout race; fall back to end.
        messagesListRef.current?.scrollToEnd({ animated: true });
      }
    }, 200);
    setHighlightMessageId(scrollToMessageId);
    const clearTimer = setTimeout(() => {
      setHighlightMessageId(null);
      // Releasing the anchor lets the messages query fall back to default (latest) on next refetch.
      setScrollToMessageId(null);
    }, 1000);
    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [scrollToMessageId, messages]);
  const hasOnlySelfConversation =
    conversationOrigin === 'social' && conversations.length === 1 && conversations[0]?.kind === 'self';
  const hasNoBuddyConversations = conversationOrigin === 'buddy_post' && conversations.length === 0;

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-[#EEF3FF]">
        <ActivityIndicator size="large" color="#FF9F6E" />
      </View>
    );
  }

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriendIds((current) =>
      current.includes(friendId) ? current.filter((v) => v !== friendId) : [...current, friendId],
    );
  };

  const resolveConversationId = async (item: ConversationItem): Promise<string | null> => {
    if (item.conversationId) return item.conversationId;
    if (item.kind === 'self') {
      const res = await api.get('/chat/conversations/self');
      return (res.data.data as ChatConversation).id;
    }
    if (item.kind === 'direct' && item.friendUserId) {
      const res = await api.get(`/chat/conversations/direct/${item.friendUserId}`);
      return (res.data.data as ChatConversation).id;
    }
    if (item.kind === 'group' && item.groupId) {
      const res = await api.get(`/chat/conversations/group/${item.groupId}`);
      return (res.data.data as ChatConversation).id;
    }
    return null;
  };

  const openConversation = async (item: ConversationItem, options?: { scrollToMessageId?: string | null }) => {
    setSelectedConversation(item);
    setDraftMessage('');
    setActiveConversationId(null);
    setScrollToMessageId(options?.scrollToMessageId ?? null);
    setHighlightMessageId(null);
    setIsConversationVisible(true);
    setLoadingConversation(true);
    try {
      const convId = await resolveConversationId(item);
      setActiveConversationId(convId);
      if (convId) {
        // Optimistic mark-read: the mutation flips unread_count to 0 in the
        // conversations cache synchronously, so the red badge disappears the
        // same frame the chat opens.
        markRead.mutate(convId);
      }
    } catch (err) {
      // P2.8: messages won't load — user sees empty chat with no signal.
      reportToSentry(err, { source: 'social.openChat' });
    } finally {
      setLoadingConversation(false);
    }
  };

  // ---- Cross-route open intent from /social/search ----------------------------
  const openIntent = useSearchIntentStore((s) => s.openIntent);
  const clearOpenIntent = useSearchIntentStore((s) => s.clearOpenIntent);

  useEffect(() => {
    if (!openIntent) return;
    // If the caller specified which origin (Friends vs Buddy) the conversation
    // lives under, flip the tab first so the `conversations` memo recomputes
    // against the right source list. The effect will re-run with the new tab.
    if (openIntent.origin && openIntent.origin !== conversationOrigin) {
      setConversationOrigin(openIntent.origin);
      return;
    }
    // The conversations memo derives from friends + groups + backend convs. Wait
    // until at least one of them resolves so we can attach the right kind/title.
    const target = conversations.find((c) => c.conversationId === openIntent.conversationId);
    if (!target) {
      // Conversation not surfaced in current list (e.g. self-chat that hasn't loaded yet).
      // Don't clear the intent yet — it'll re-run when `conversations` settles.
      return;
    }
    void openConversation(target, { scrollToMessageId: openIntent.scrollToMessageId ?? null });
    clearOpenIntent();
    // openConversation is stable enough for the lookup; depending on conversations is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openIntent, conversations, conversationOrigin]);

  const handleSendText = async () => {
    if (!activeConversationId || !draftMessage.trim()) return;
    const text = draftMessage.trim();
    setDraftMessage('');

    if (editingMessage) {
      const msgId = editingMessage.id;
      setEditingMessage(null);
      try {
        await editMessage.mutateAsync({ messageId: msgId, body: text });
      } catch (err) {
        // P2.8: edit-expired race vs real server failure indistinguishable
        // to the user; capture so we can tell the two apart in dashboards.
        Alert.alert(t.common.error, t.chat.edit_expired);
        reportToSentry(err, { source: 'social.editMessage' });
      }
      return;
    }

    const meta: Record<string, unknown> = {};
    if (replyTo) {
      meta.reply_to_id = replyTo.id;
      meta.reply_to_type = replyTo.type;
      meta.reply_to_body = replyTo.body ?? '';
      meta.reply_to_sender_name = replyTo.sender.display_name;
      setReplyTo(null);
    }

    await sendMessage.mutateAsync({
      type: 'text',
      body: text,
      meta: Object.keys(meta).length > 0 ? meta : undefined,
    });
  };

  const handlePickImage = async () => {
    if (!activeConversationId) return;
    setIsPlusVisible(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const filename = asset.fileName ?? `photo_${Date.now()}.jpg`;
    const mimeType = asset.mimeType ?? 'image/jpeg';

    setUploadingImage(true);
    try {
      const { url } = await uploadMedia.mutateAsync({ uri: asset.uri, name: filename, type: mimeType });
      await sendMessage.mutateAsync({ type: 'image', media_url: url });
    } catch (err) {
      Alert.alert(t.common.error, t.chat.upload_failed);
      reportToSentry(err, { source: 'social.uploadImage' });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSendSticker = async (mediaUrl: string) => {
    if (!activeConversationId) return;
    setIsEmojiVisible(false);
    await sendMessage.mutateAsync({ type: 'sticker', media_url: mediaUrl });
  };

  const handleAddSticker = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const filename = asset.fileName ?? `sticker_${Date.now()}.jpg`;
    const mimeType = asset.mimeType ?? 'image/jpeg';
    setUploadingSticker(true);
    try {
      const { url } = await uploadStickerMedia.mutateAsync({ uri: asset.uri, name: filename, type: mimeType });
      await saveSticker.mutateAsync({ media_url: url });
    } catch (err) {
      Alert.alert(t.common.error, t.chat.upload_failed);
      reportToSentry(err, { source: 'social.uploadSticker' });
    } finally {
      setUploadingSticker(false);
    }
  };

  const msgIndexMap = useMemo(() => {
    const map: Record<string, number> = {};
    messages.forEach((m, i) => { map[m.id] = i; });
    return map;
  }, [messages]);

  const showToast = useCallback((msg: string) => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToastMsg(msg);
    toastTimeout.current = setTimeout(() => setToastMsg(null), 2000);
  }, []);

  const handleReplyBlockPress = useCallback((originalId: string) => {
    const index = msgIndexMap[originalId];
    if (index != null && messagesListRef.current) {
      messagesListRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    }
  }, [msgIndexMap]);

  const handleMessageLongPress = useCallback((msg: ChatMessage, isMe: boolean, pageY: number, pageX: number) => {
    setContextMenu({ visible: true, message: msg, isMe, pageY, pageX });
  }, []);

  const closeContextMenu = () => setContextMenu({ visible: false, message: null, isMe: false, pageY: 0, pageX: 0 });

  const handleFavoriteToggle = async (messageId: string) => {
    if (!activeConversationId) return;
    const isFav = conversationFavoritesQuery.data?.includes(messageId) ?? false;
    try {
      if (isFav) {
        await unfavoriteMessage.mutateAsync({ messageId, conversationId: activeConversationId });
      } else {
        await favoriteMessage.mutateAsync({ messageId, conversationId: activeConversationId });
        showToast(t.chat.toast_favorited);
      }
    } catch (err) {
      // P2.8: distinguish duplicate-favorite (409) noise from real failures.
      // axios interceptor already drops 4xx; this catches non-Axios paths.
      reportToSentry(err, { source: 'social.toggleFavorite' });
    }
  };

  const handleDeleteDialog = (msg: ChatMessage, isMe: boolean) => {
    const buttons: { text: string; style?: 'cancel' | 'destructive' | 'default'; onPress?: () => void }[] = [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.chat.delete_for_me,
        onPress: () => void deleteMessage.mutateAsync({ messageId: msg.id, scope: 'self' }),
      },
    ];
    if (isMe) {
      buttons.push({
        text: t.chat.delete_for_all,
        style: 'destructive',
        onPress: () => void deleteMessage.mutateAsync({ messageId: msg.id, scope: 'all' }),
      });
    }
    Alert.alert(t.chat.delete_message, t.chat.delete_confirm, buttons);
  };

  const handleMenuAction = (actionId: string) => {
    const msg = contextMenu.message;
    const isMe = contextMenu.isMe;
    if (!msg) return;
    closeContextMenu();
    switch (actionId) {
      case 'save':
        void saveSticker.mutateAsync({ media_url: msg.media_url! });
        showToast(t.chat.sticker_saved);
        break;
      case 'copy':
        void Clipboard.setStringAsync(msg.body ?? '');
        showToast(t.chat.toast_copied);
        break;
      case 'forward':
        setForwardMessage(msg);
        setIsForwardVisible(true);
        break;
      case 'favorite':
        void handleFavoriteToggle(msg.id);
        break;
      case 'quote':
        setReplyTo(msg);
        break;
      case 'select':
        setIsMultiSelect(true);
        setSelectedMsgIds(new Set([msg.id]));
        break;
      case 'edit':
        if (isMe) {
          setEditingMessage(msg);
          setDraftMessage(msg.body ?? '');
        }
        break;
      case 'delete':
        handleDeleteDialog(msg, isMe);
        break;
      case 'related':
      case 'remind':
        Alert.alert('', '该功能即将上线');
        break;
      case 'screenshot':
        showToast(t.chat.action_screenshot + ' - 即将上线');
        break;
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedFriendIds.length === 0) return;
    const group = await createGroup.mutateAsync({
      name: groupName.trim(),
      city: user.city,
      member_ids: selectedFriendIds,
    });
    setGroupName('');
    setSelectedFriendIds([]);
    setIsCreateGroupVisible(false);
    void openConversation({
      id: `group-${group.id}`,
      kind: 'group',
      title: group.name,
      subtitle: group.description ?? `${group.member_count} ${t.social.group_members}`,
      timestamp: group.next_event_at ?? null,
      unreadCount: 0,
      avatarUrls: group.members
        .slice(0, 2)
        .map((member) => resolveMediaUrl(member.user.avatar_url) ?? '')
        .filter(Boolean),
      group,
      groupId: group.id,
    });
  };

  const handleCreateMeetup = async () => {
    if (
      !selectedGroupId ||
      !eventTitle.trim() ||
      !eventPlace ||
      !eventTimeRange.start ||
      !eventTimeRange.end
    ) {
      return;
    }
    await createGroupEvent.mutateAsync({
      title: eventTitle.trim(),
      place_name: eventPlace.name,
      location_hint: eventPlace.address || undefined,
      starts_at: eventTimeRange.start.toISOString(),
      ends_at: eventTimeRange.end.toISOString(),
      city: selectedConversation?.group?.city ?? user.city,
    });
    setEventTitle('');
    setEventPlace(null);
    setEventTimeRange({ start: null, end: null });
    setIsCreateMeetupVisible(false);
  };

  const renderMessage = useCallback(
    ({ item, index }: { item: ChatMessage; index: number }) => {
      const isMe = item.sender.id === user.id;
      const prevTs = index > 0 ? messages[index - 1]?.created_at : undefined;
      const showTimestamp =
        index === 0 ||
        (prevTs != null && new Date(item.created_at).getTime() - new Date(prevTs).getTime() > 5 * 60 * 1000);
      return (
        <View>
          {showTimestamp ? (
            <Text
              style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginTop: 4, marginBottom: 10 }}
            >
              {formatConversationTime(item.created_at, langCode)}
            </Text>
          ) : null}
          <MessageBubble
            message={item}
            isMe={isMe}
            userAvatar={userAvatar}
            userDisplayName={user.display_name ?? ''}
            onImagePress={setLightboxUrl}
            onLongPress={handleMessageLongPress}
            editedLabel={t.chat.edited_label}
            deletedLabel={t.chat.msg_deleted}
            isMultiSelect={isMultiSelect}
            isSelected={selectedMsgIds.has(item.id)}
            isFavorited={favoritedIds.has(item.id)}
            highlighted={highlightMessageId === item.id}
            onSelect={(id) => setSelectedMsgIds((prev) => {
              const next = new Set(prev);
              next.has(id) ? next.delete(id) : next.add(id);
              return next;
            })}
            onReplyPress={handleReplyBlockPress}
          />
        </View>
      );
    },
    [messages, langCode, user.id, userAvatar, user.display_name, handleMessageLongPress, t.chat.edited_label, t.chat.msg_deleted, isMultiSelect, selectedMsgIds, favoritedIds, handleReplyBlockPress],
  );

  return (
    <AppBackground>
    <SafeAreaView className="flex-1" edges={[]}>
      <View className="flex-1">
        {/* Yellow band hero — wraps the existing buttons + search bar so the
            top of Social matches the YumQuick treatment used on Tasks/Plaza/
            Buddy/auth. White circle buttons sit on the band; search bar
            stays as a full white capsule. */}
        <View
          style={{
            backgroundColor: '#FFD17E',
            paddingTop: Math.max(insets.top + 12, 36),
            paddingBottom: 22,
            paddingHorizontal: 18,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
          }}
        >
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => setIsMenuVisible(true)}
              className="h-12 w-12 items-center justify-center rounded-full bg-white"
              style={styles.floatingButton}
            >
              <ChalkIcon name="plus" size={26} color="#241A16" />
            </Pressable>
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={() => router.push('/notifications?category=social' as never)}
                className="h-12 w-12 items-center justify-center rounded-full bg-white"
                style={styles.floatingButton}
              >
                <Ionicons name="notifications-outline" size={22} color="#241A16" />
                {(notificationsQuery?.data?.unread_count ?? 0) > 0 ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      minWidth: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: colors.brandCoral,
                      paddingHorizontal: 4,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>
                      {Math.min(notificationsQuery?.data?.unread_count ?? 0, 99)}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
              <Pressable onPress={() => router.push('/(tabs)/profile')}>
                <SingleAvatar uri={userAvatar} size={48} label={user.display_name} tint="#FFE8DA" />
              </Pressable>
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/social/search')}
            className="mt-5 flex-row items-center rounded-[20px] bg-white px-4"
            style={[styles.searchShell, { height: 50 }]}
          >
            <ChalkIcon name="search" size={20} color={colors.textSubtle} />
            <Text style={{ marginLeft: 12, flex: 1, fontSize: 15, color: colors.textSubtle }}>
              {t.social.search_messages_placeholder}
            </Text>
          </Pressable>
        </View>

        {socialQuery.isError ? (
          <Text style={{ paddingHorizontal: 20, paddingTop: 12, fontSize: 12, fontWeight: '600', color: colors.danger }}>
            {t.common.error}
          </Text>
        ) : null}

        <ScrollView className="mt-3 flex-1" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 130 }}>
          {socialQuery.isLoading && !socialQuery.data ? (
            <View className="px-5 pt-8">
              <ActivityIndicator size="small" color={colors.brandCoral} />
            </View>
          ) : null}

          {incomingRequests.length > 0 ? (
            <>
              <SectionTitle>{t.social.incoming_requests}</SectionTitle>
              <Pressable
                onPress={() => setIsConnectionsVisible(true)}
                style={({ pressed }) => [
                  {
                    marginHorizontal: 20,
                    marginBottom: 8,
                    borderRadius: 22,
                    paddingHorizontal: 20,
                    paddingVertical: 16,
                    backgroundColor: '#FFFFFF',
                    ...shadows.card,
                  },
                  pressed ? { transform: [{ scale: 0.99 }] } : null,
                ]}
              >
                <View className="flex-row items-center">
                  {/* Leading icon sized like ConversationAvatar (56) so the
                      headline text starts at the same x-offset as the
                      conversation rows below — visually aligned column. */}
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: '#FFE6EA',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="person-add" size={26} color={colors.brandCoral} />
                  </View>
                  <View className="ml-4 flex-1 pr-2">
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textMain }}>
                      {incomingRequests.length} {t.social.incoming_requests}
                    </Text>
                    <Text style={{ marginTop: 4, fontSize: 13, lineHeight: 18, color: colors.textMuted }}>
                      {incomingRequests[0]?.user.display_name}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSubtle} />
                </View>
              </Pressable>
            </>
          ) : null}

          <SectionTitle>{t.social.title}</SectionTitle>
          <View
            style={{
              marginHorizontal: 20,
              marginBottom: 10,
              flexDirection: 'row',
              backgroundColor: '#FFFFFF',
              borderRadius: 999,
              padding: 4,
              borderWidth: 1,
              borderColor: '#E5E7EB',
            }}
          >
            {(['social', 'buddy_post'] as const).map((origin) => {
              const active = conversationOrigin === origin;
              const label = origin === 'social' ? t.social.tab_friends : t.social.tab_buddy;
              return (
                <Pressable
                  key={origin}
                  onPress={() => setConversationOrigin(origin)}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: active ? '#F47C7C' : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#FFF' : '#6B7280' }}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View
            style={{
              marginHorizontal: 20,
              borderRadius: 22,
              overflow: 'hidden',
              backgroundColor: '#FFFFFF',
              ...shadows.card,
            }}
          >
            {conversations.map((item, index) => (
              <View key={item.id}>
                <ConversationRow item={item} langCode={langCode} onPress={() => void openConversation(item)} />
                {index < conversations.length - 1 ? (
                  <View style={{ marginLeft: 88, height: 1, backgroundColor: colors.lineSofter }} />
                ) : null}
              </View>
            ))}
          </View>

          {hasOnlySelfConversation ? (
            // Empty state — solid white card, matching the conversation card
            // above. The lavender accent is concentrated in the small bubble
            // illustration, not spread across the whole card surface, so the
            // card no longer reads as "white-ish rectangle on cream".
            <View
              style={{
                marginHorizontal: 20,
                marginTop: 20,
                paddingHorizontal: 22,
                paddingVertical: 28,
                borderRadius: 22,
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                ...shadows.card,
              }}
            >
              {/* Illustrated empty state — soft lavender bubble + sparkles */}
              <View
                style={{
                  width: 78,
                  height: 78,
                  borderRadius: 39,
                  marginBottom: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  backgroundColor: '#EFE8FF',
                }}
              >
                <Ionicons name="chatbubbles-outline" size={32} color={colors.lavender} />
              </View>
              <Text style={{ fontSize: 14, opacity: 0.5, marginBottom: 4 }}>✦ ✦ ✦</Text>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textMain, textAlign: 'center' }}>
                {t.social.no_other_chats}
              </Text>
              <Text style={{ marginTop: 6, fontSize: 13, lineHeight: 19, color: colors.textMuted, textAlign: 'center' }}>
                {t.social.no_other_chats_hint}
              </Text>
            </View>
          ) : null}

          {hasNoBuddyConversations ? (
            // Buddy tab empty state — points the user back to the Buddy feed,
            // since this list only fills via "联系 ta" on a buddy post (no
            // friending, no group creation here).
            <View
              style={{
                marginHorizontal: 20,
                marginTop: 20,
                paddingHorizontal: 22,
                paddingVertical: 28,
                borderRadius: 22,
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                ...shadows.card,
              }}
            >
              <View
                style={{
                  width: 78,
                  height: 78,
                  borderRadius: 39,
                  marginBottom: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  backgroundColor: '#FFE8DA',
                }}
              >
                <Ionicons name="people-outline" size={32} color={colors.brandCoral} />
              </View>
              <Text style={{ fontSize: 14, opacity: 0.5, marginBottom: 4 }}>✦ ✦ ✦</Text>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textMain, textAlign: 'center' }}>
                {t.social.buddy_no_conversations}
              </Text>
              <Text style={{ marginTop: 6, fontSize: 13, lineHeight: 19, color: colors.textMuted, textAlign: 'center' }}>
                {t.social.buddy_no_conversations_hint}
              </Text>
              <Pressable
                onPress={() => router.push('/(tabs)/buddy' as never)}
                android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                style={{
                  marginTop: 16,
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 999,
                  backgroundColor: colors.brandCoral,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>
                  {t.social.buddy_no_conversations_cta}
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View style={{ height: 28 }} />
        </ScrollView>
      </View>

      {/* ── Menu modal ── */}
      <Modal visible={isMenuVisible} transparent animationType="fade" onRequestClose={() => setIsMenuVisible(false)}>
        <Pressable className="flex-1 bg-black/10" onPress={() => setIsMenuVisible(false)}>
          <View
            className="absolute left-5 rounded-[24px] bg-white p-2"
            style={[styles.menuCard, { top: Math.max(insets.top + 64, 88), width: 230 }]}
          >
            <Pressable
              onPress={() => { setIsMenuVisible(false); setIsCreateGroupVisible(true); }}
              className="flex-row items-center rounded-[18px] px-4 py-4"
            >
              <ChalkIcon name="message" size={22} color="#111827" />
              <Text className="ml-3 text-[16px] font-semibold text-slate-900">{t.social.menu_create_group_chat}</Text>
            </Pressable>
            <Pressable
              onPress={() => { setIsMenuVisible(false); setIsConnectionsVisible(true); }}
              className="flex-row items-center rounded-[18px] px-4 py-4"
            >
              <Ionicons name="person-add-outline" size={22} color="#111827" />
              <Text className="ml-3 text-[16px] font-semibold text-slate-900">{t.social.menu_add_friend_group}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* ── Connections modal ── */}
      <Modal visible={isConnectionsVisible} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setIsConnectionsVisible(false)}>
        <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right, backgroundColor: '#F6F7FB' }}>
          <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View className="flex-row items-center justify-between px-5 pb-4 pt-4">
              <Pressable onPress={() => setIsConnectionsVisible(false)}>
                <Ionicons name="close" size={28} color="#111827" />
              </Pressable>
              <Text className="text-[22px] font-extrabold text-slate-900">{t.social.manage_connections_title}</Text>
              <View style={{ width: 28 }} />
            </View>

            <ScrollView className="flex-1 px-5" keyboardShouldPersistTaps="handled">
              <View className="rounded-[24px] bg-white px-4 py-4" style={styles.panelCard}>
                <Text className="text-[15px] leading-6 text-slate-500">{t.social.manage_connections_hint}</Text>
                <View className="mt-4 flex-row items-center rounded-[18px] bg-[#F3F6FC] px-4 py-3">
                  <Ionicons name="search" size={20} color="#94A3B8" />
                  <TextInput
                    value={peopleSearch}
                    onChangeText={setPeopleSearch}
                    placeholder={t.social.search_placeholder}
                    placeholderTextColor="#94A3B8"
                    className="ml-3 flex-1 text-[16px] text-slate-900"
                  />
                </View>
              </View>

              {incomingRequests.length > 0 ? (
                <>
                  <SectionTitle>{t.social.incoming_requests}</SectionTitle>
                  <View className="overflow-hidden rounded-[24px] bg-white" style={styles.panelCard}>
                    {incomingRequests.map((request, index) => (
                      <View key={request.id}>
                        <View className="flex-row items-center px-4 py-4">
                          <SingleAvatar uri={resolveMediaUrl(request.user.avatar_url) ?? null} size={46} label={request.user.display_name} tint="#E8EEFF" />
                          <View className="ml-3 flex-1 pr-2">
                            <Text className="text-[16px] font-semibold text-slate-900">{request.user.display_name}</Text>
                            <Text className="mt-1 text-[13px] text-slate-500">
                              {formatDisplayLocation(request.user.city) ?? request.user.city}
                            </Text>
                          </View>
                          <View className="flex-row items-center">
                            <Pressable onPress={() => void acceptFriendRequest.mutateAsync(request.id)} className="rounded-full bg-[#FF9F6E] px-4 py-2">
                              <Text className="text-xs font-extrabold text-white">{t.social.accept}</Text>
                            </Pressable>
                            <Pressable onPress={() => void declineFriendRequest.mutateAsync(request.id)} className="ml-2 rounded-full bg-[#EEF2F8] px-4 py-2">
                              <Text className="text-xs font-extrabold text-slate-600">{t.social.decline}</Text>
                            </Pressable>
                          </View>
                        </View>
                        {index < incomingRequests.length - 1 ? <View className="ml-[74px] h-px bg-slate-100" /> : null}
                      </View>
                    ))}
                  </View>
                </>
              ) : null}

              {outgoingRequests.length > 0 ? (
                <>
                  <SectionTitle>{t.social.outgoing_requests}</SectionTitle>
                  <View className="rounded-[24px] bg-white px-4 py-3" style={styles.panelCard}>
                    {outgoingRequests.map((request) => (
                      <Text key={request.id} className="py-1 text-[14px] text-slate-500">
                        {request.user.display_name} · {t.social.request_sent}
                      </Text>
                    ))}
                  </View>
                </>
              ) : null}

              <SectionTitle>{t.social.search_title}</SectionTitle>
              <View className="overflow-hidden rounded-[24px] bg-white" style={styles.panelCard}>
                {searchUsersQuery.isFetching ? (
                  <View className="px-4 py-5">
                    <ActivityIndicator size="small" color="#FF9F6E" />
                  </View>
                ) : null}
                {(searchUsersQuery.data ?? []).map((item, index) => (
                  <View key={item.id}>
                    <View className="flex-row items-center px-4 py-4">
                      <SingleAvatar uri={resolveMediaUrl(item.avatar_url) ?? null} size={46} label={item.display_name} tint="#FDEADA" />
                      <View className="ml-3 flex-1 pr-2">
                        <Text className="text-[16px] font-semibold text-slate-900">{item.display_name}</Text>
                        <Text className="mt-1 text-[13px] text-slate-500">
                          {formatDisplayLocation(item.city) ?? item.city}
                        </Text>
                      </View>
                      {item.relationship_state === 'none' ? (
                        <Pressable
                          onPress={() => router.push({ pathname: '/users/[id]', params: { id: item.id } })}
                          className="rounded-full bg-[#111827] px-4 py-2"
                        >
                          <Text className="text-xs font-extrabold text-white">{t.social.add_friend}</Text>
                        </Pressable>
                      ) : (
                        <View className="rounded-full bg-[#EEF2F8] px-4 py-2">
                          <Text className="text-xs font-extrabold text-slate-500">
                            {item.relationship_state === 'friends'
                              ? t.social.already_friends
                              : item.relationship_state === 'incoming_pending'
                                ? t.social.request_received
                                : t.social.request_sent}
                          </Text>
                        </View>
                      )}
                    </View>
                    {index < (searchUsersQuery.data ?? []).length - 1 ? <View className="ml-[74px] h-px bg-slate-100" /> : null}
                  </View>
                ))}
                {!searchUsersQuery.isFetching && peopleSearch.trim().length >= 2 && (searchUsersQuery.data?.length ?? 0) === 0 ? (
                  <View className="px-4 py-5">
                    <Text className="text-[14px] leading-6 text-slate-500">{t.social.search_empty}</Text>
                  </View>
                ) : null}
              </View>
              <View style={{ height: 24 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── Create group modal ── */}
      <Modal visible={isCreateGroupVisible} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setIsCreateGroupVisible(false)}>
        <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right, backgroundColor: '#F6F7FB' }}>
          <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View className="flex-row items-center justify-between px-5 pb-4 pt-4">
              <Pressable onPress={() => setIsCreateGroupVisible(false)}>
                <Ionicons name="close" size={28} color="#111827" />
              </Pressable>
              <Text className="text-[22px] font-extrabold text-slate-900">{t.social.create_group}</Text>
              <View style={{ width: 28 }} />
            </View>

            <ScrollView className="flex-1 px-5" keyboardShouldPersistTaps="handled">
              <View className="rounded-[24px] bg-white px-4 py-4" style={styles.panelCard}>
                <Text className="text-[13px] font-bold uppercase tracking-[1px] text-slate-400">{t.social.group_name_label}</Text>
                <TextInput
                  value={groupName}
                  onChangeText={setGroupName}
                  placeholder={t.social.group_name}
                  placeholderTextColor="#94A3B8"
                  className="mt-3 rounded-[18px] bg-[#F3F6FC] px-4 py-3 text-[16px] text-slate-900"
                />
              </View>

              <SectionTitle>{t.social.select_friends}</SectionTitle>
              <View className="rounded-[24px] bg-white px-4 py-4" style={styles.panelCard}>
                {friends.length === 0 ? (
                  <View>
                    <Text className="text-[15px] font-semibold text-slate-900">{t.social.no_friends}</Text>
                    <Pressable
                      onPress={() => { setIsCreateGroupVisible(false); setIsConnectionsVisible(true); }}
                      className="mt-4 self-start rounded-full bg-[#111827] px-4 py-3"
                    >
                      <Text className="text-xs font-extrabold text-white">{t.social.menu_add_friend_group}</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View className="flex-row flex-wrap">
                    {friends.map((friendship) => {
                      const isSelected = selectedFriendIds.includes(friendship.user.id);
                      return (
                        <Pressable
                          key={friendship.id}
                          onPress={() => toggleFriendSelection(friendship.user.id)}
                          className="mb-3 mr-3 rounded-full border px-4 py-3"
                          style={{
                            borderColor: isSelected ? '#FF9F6E' : '#E5EAF4',
                            backgroundColor: isSelected ? '#EEF1FF' : '#F8FAFD',
                          }}
                        >
                          <Text style={{ color: isSelected ? '#4C57C8' : '#334155', fontWeight: '700' }}>
                            {friendship.user.display_name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>

              <Pressable
                onPress={() => void handleCreateGroup()}
                disabled={!groupName.trim() || selectedFriendIds.length === 0 || createGroup.isPending}
                className="mb-8 mt-5 items-center rounded-[24px] px-5 py-4"
                style={{
                  backgroundColor:
                    !groupName.trim() || selectedFriendIds.length === 0 || createGroup.isPending ? '#D6DBF2' : '#FF385C',
                }}
              >
                <Text className="text-[16px] font-extrabold text-white">
                  {createGroup.isPending ? t.common.loading : t.social.create_group_submit}
                </Text>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── Conversation modal ── */}
      <Modal
        visible={isConversationVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        supportedOrientations={['portrait']}
        onRequestClose={() => {
          setIsConversationVisible(false);
          setIsEmojiVisible(false);
          setIsPlusVisible(false);
          setLightboxUrl(null);
          setContextMenu({ visible: false, message: null, isMe: false, pageY: 0, pageX: 0 });
          setReplyTo(null);
          setEditingMessage(null);
          setIsMultiSelect(false);
          setSelectedMsgIds(new Set());
          setToastMsg(null);
        }}
      >
        {/* IOS-LOGIN-111: iOS Modal opens in a separate UIWindow whose safe-area
            insets aren't reliably forwarded to SafeAreaView. Use the outer
            insets directly. See plaza.tsx compose modal for the same pattern. */}
        <View style={{ flex: 1, paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right, backgroundColor: '#EDEFF3' }}>
          <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {/* Header */}
            <View
              style={{
                backgroundColor: isMultiSelect ? '#1C1C1E' : '#FFFFFF',
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: '#E0E3EB',
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 12,
              }}
            >
              {isMultiSelect ? (
                <>
                  <Pressable onPress={() => { setIsMultiSelect(false); setSelectedMsgIds(new Set()); }} style={{ padding: 4 }} hitSlop={8}>
                    <Ionicons name="close" size={27} color="#FFFFFF" />
                  </Pressable>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
                      {selectedMsgIds.size} {t.chat.multi_selected}
                    </Text>
                  </View>
                  <View style={{ width: 27 }} />
                </>
              ) : (
                <>
                  <Pressable
                    onPress={() => {
                      setIsConversationVisible(false);
                      setIsEmojiVisible(false);
                      setIsPlusVisible(false);
                      setLightboxUrl(null);
                      setContextMenu({ visible: false, message: null, isMe: false, pageY: 0, pageX: 0 });
                      setReplyTo(null);
                      setEditingMessage(null);
                      setIsMultiSelect(false);
                      setSelectedMsgIds(new Set());
                      setToastMsg(null);
                    }}
                    style={{ padding: 4 }}
                    hitSlop={8}
                  >
                    <Ionicons name="chevron-back" size={27} color="#111827" />
                  </Pressable>
                  <View style={{ flex: 1, alignItems: 'center', marginHorizontal: 10 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }} numberOfLines={1}>
                      {selectedConversation?.title}
                    </Text>
                    {selectedConversation?.kind === 'group' && groupDetailQuery.data ? (
                      <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                        {groupDetailQuery.data.member_count} {t.social.group_members}
                      </Text>
                    ) : selectedConversation?.kind === 'self' ? (
                      <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                        {t.social.self_chat_subtitle}
                      </Text>
                    ) : null}
                  </View>
                  <Pressable style={{ padding: 4 }} hitSlop={8}>
                    <Ionicons name="ellipsis-horizontal" size={24} color="#374151" />
                  </Pressable>
                </>
              )}
            </View>

            {/* Messages */}
            {loadingConversation ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="small" color="#FF9F6E" />
              </View>
            ) : (
              <FlatList
                ref={messagesListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 20 }}
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={() => {
                  if (messages.length > 0) {
                    messagesListRef.current?.scrollToEnd({ animated: false });
                  }
                }}
                ListHeaderComponent={
                  selectedConversation?.kind === 'group' ? (
                    <View
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 20,
                        padding: 16,
                        marginBottom: 14,
                        shadowColor: '#000',
                        shadowOpacity: 0.05,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: 2,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1, paddingRight: 12 }}>
                          <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>{t.social.group_events}</Text>
                          <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 3 }}>{t.social.open_group_space}</Text>
                        </View>
                        <Pressable
                          onPress={() => setIsCreateMeetupVisible(true)}
                          style={{ backgroundColor: '#111827', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 }}
                        >
                          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>{t.social.create_event}</Text>
                        </Pressable>
                      </View>
                      {groupDetailQuery.isLoading ? (
                        <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                          <ActivityIndicator size="small" color="#FF9F6E" />
                        </View>
                      ) : null}
                      {(groupDetailQuery.data?.events ?? []).map((event) => (
                        <View
                          key={event.id}
                          style={{
                            marginTop: 12,
                            borderRadius: 16,
                            backgroundColor: '#FFF9E9',
                            borderWidth: 1,
                            borderColor: '#F2E8C8',
                            padding: 14,
                          }}
                        >
                          <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>{event.title}</Text>
                          <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                            {event.place_name}
                            {event.location_hint ? ` · ${event.location_hint}` : ''}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{formatEventLine(event, langCode)}</Text>
                          <Pressable
                            onPress={() => void addSocialEventToOdyssey.mutateAsync(event.id)}
                            disabled={event.viewer_added_to_tasks || addSocialEventToOdyssey.isPending}
                            style={{
                              marginTop: 12,
                              alignSelf: 'flex-start',
                              borderRadius: 20,
                              paddingHorizontal: 14,
                              paddingVertical: 8,
                              backgroundColor: event.viewer_added_to_tasks ? '#DCE7D4' : '#FF385C',
                            }}
                          >
                            <Text style={{ color: event.viewer_added_to_tasks ? '#2D6A3D' : '#FFFFFF', fontWeight: '800', fontSize: 12 }}>
                              {event.viewer_added_to_tasks ? t.social.added_to_tasks : t.social.add_to_tasks}
                            </Text>
                          </Pressable>
                        </View>
                      ))}
                      {!groupDetailQuery.isLoading && (groupDetailQuery.data?.events.length ?? 0) === 0 ? (
                        <Text style={{ marginTop: 12, fontSize: 13, color: '#9CA3AF', lineHeight: 20 }}>
                          {t.social.no_group_events}
                        </Text>
                      ) : null}
                    </View>
                  ) : null
                }
                ListEmptyComponent={
                  !messagesQuery.isLoading ? (
                    <View style={{ alignItems: 'center', marginTop: selectedConversation?.kind === 'group' ? 8 : 40 }}>
                      <Text style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 22 }}>
                        {selectedConversation?.kind === 'self'
                          ? t.social.conversation_empty_self
                          : selectedConversation?.kind === 'group'
                            ? t.social.conversation_empty_group
                            : t.social.conversation_empty_direct}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ alignItems: 'center', marginTop: 40 }}>
                      <ActivityIndicator size="small" color="#FF9F6E" />
                    </View>
                  )
                }
              />
            )}

            {/* Upload status bar */}
            {uploadingImage ? (
              <View style={{ backgroundColor: '#EEF3FF', paddingHorizontal: 16, paddingVertical: 6, flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#FF9F6E" />
                <Text style={{ marginLeft: 8, fontSize: 13, color: '#FF9F6E' }}>{t.chat.uploading}</Text>
              </View>
            ) : null}

            {/* Reply-to preview bar */}
            {replyTo ? (
              <View style={{ backgroundColor: '#EEF3FF', paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#D1D5DB' }}>
                <View style={{ width: 3, height: 36, borderRadius: 2, backgroundColor: '#FF9F6E', marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#FF9F6E' }} numberOfLines={1}>{replyTo.sender.display_name}</Text>
                  <Text style={{ fontSize: 12, color: '#6B7280' }} numberOfLines={1}>{replyTo.body ?? '[media]'}</Text>
                </View>
                <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
                  <Ionicons name="close" size={20} color="#9CA3AF" />
                </Pressable>
              </View>
            ) : null}

            {/* Edit mode indicator */}
            {editingMessage ? (
              <View style={{ backgroundColor: '#FFF9EC', paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F5E6B8' }}>
                <Ionicons name="pencil-outline" size={16} color="#B45309" style={{ marginRight: 8 }} />
                <Text style={{ flex: 1, fontSize: 12, color: '#B45309', fontWeight: '600' }}>{t.chat.editing_message}</Text>
                <Pressable onPress={() => { setEditingMessage(null); setDraftMessage(''); }} hitSlop={8}>
                  <Ionicons name="close" size={20} color="#B45309" />
                </Pressable>
              </View>
            ) : null}

            {/* Multi-select bottom toolbar */}
            {isMultiSelect ? (
              <View
                style={{
                  backgroundColor: '#1C1C1E',
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: '#333333',
                  flexDirection: 'row',
                  justifyContent: 'space-around',
                  paddingTop: 12,
                  paddingBottom: chatBottomInset + 12,
                }}
              >
                {[
                  { id: 'fwd', icon: 'arrow-redo-outline' as const, label: t.chat.action_forward, color: '#FFFFFF', onPress: () => {
                    if (selectedMsgIds.size === 0) return;
                    const firstMsg = messages.find((m) => m.id === Array.from(selectedMsgIds)[0]) ?? null;
                    if (firstMsg) { setForwardMessage(firstMsg); setIsForwardVisible(true); }
                  }},
                  { id: 'fav', icon: 'star-outline' as const, label: t.chat.action_favorite, color: '#FFFFFF', onPress: () => {
                    for (const id of Array.from(selectedMsgIds)) void handleFavoriteToggle(id);
                    setIsMultiSelect(false); setSelectedMsgIds(new Set());
                  }},
                  { id: 'ss', icon: 'camera-outline' as const, label: t.chat.action_screenshot, color: '#FFFFFF', onPress: () => {
                    showToast(t.chat.action_screenshot + ' - 即将上线');
                  }},
                  { id: 'del', icon: 'trash-outline' as const, label: t.chat.delete_message, color: '#FF453A', onPress: () => {
                    if (selectedMsgIds.size === 0) return;
                    Alert.alert(t.chat.delete_message, t.chat.delete_confirm, [
                      { text: t.common.cancel, style: 'cancel' },
                      { text: t.chat.delete_for_me, onPress: async () => {
                        for (const id of Array.from(selectedMsgIds)) await deleteMessage.mutateAsync({ messageId: id, scope: 'self' }).catch(() => null);
                        setIsMultiSelect(false); setSelectedMsgIds(new Set());
                      }},
                      { text: t.chat.delete_for_all, style: 'destructive', onPress: async () => {
                        for (const id of Array.from(selectedMsgIds)) await deleteMessage.mutateAsync({ messageId: id, scope: 'all' }).catch(() => null);
                        setIsMultiSelect(false); setSelectedMsgIds(new Set());
                      }},
                    ]);
                  }},
                ].map((btn) => (
                  <Pressable key={btn.id} onPress={btn.onPress} style={{ alignItems: 'center', paddingHorizontal: 16 }}>
                    <Ionicons name={btn.icon} size={24} color={btn.color} />
                    <Text style={{ color: btn.color, fontSize: 11, marginTop: 4 }}>{btn.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {/* Input toolbar */}
            {!isMultiSelect ? (
            <View
              style={{
                backgroundColor: '#F7F8FA',
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: '#D1D5DB',
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 10,
                paddingTop: 10,
                paddingBottom: chatBottomInset + 8,
              }}
            >
              <Pressable style={{ padding: 5 }} hitSlop={6}>
                <Ionicons name="mic-outline" size={26} color="#6B7280" />
              </Pressable>
              <View
                style={{
                  flex: 1,
                  marginHorizontal: 8,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 22,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: '#E5E7EB',
                  justifyContent: 'center',
                }}
              >
                <TextInput
                  value={draftMessage}
                  onChangeText={setDraftMessage}
                  placeholder={
                    selectedConversation?.kind === 'self'
                      ? t.social.self_chat_placeholder
                      : t.social.conversation_input_placeholder
                  }
                  placeholderTextColor="#94A3B8"
                  style={{ fontSize: 15, color: '#1F2937', maxHeight: 100 }}
                  multiline
                  onFocus={() => { setIsEmojiVisible(false); setIsPlusVisible(false); }}
                />
              </View>
              {draftMessage.trim() ? (
                <Pressable
                  onPress={() => void handleSendText()}
                  disabled={sendMessage.isPending}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: '#FF9F6E',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
                </Pressable>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Pressable
                    style={{ padding: 5 }}
                    hitSlop={6}
                    onPress={() => { Keyboard.dismiss(); setIsPlusVisible(false); setIsEmojiVisible((v) => !v); }}
                  >
                    <Ionicons name="happy-outline" size={26} color={isEmojiVisible ? '#FF9F6E' : '#6B7280'} />
                  </Pressable>
                  <Pressable style={{ padding: 5 }} hitSlop={6} onPress={() => void handlePickImage()}>
                    <Ionicons name="image-outline" size={26} color="#6B7280" />
                  </Pressable>
                  <Pressable
                    style={{ padding: 5 }}
                    hitSlop={6}
                    onPress={() => { setIsEmojiVisible(false); setIsPlusVisible((v) => !v); }}
                  >
                    <Ionicons name="add-circle-outline" size={26} color={isPlusVisible ? '#FF9F6E' : '#6B7280'} />
                  </Pressable>
                </View>
              )}
            </View>
            ) : null}

            {/* Emoji panel */}
            {isEmojiVisible ? (
              <View style={{ backgroundColor: '#FFFFFF', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB', paddingBottom: chatBottomInset + 8 }}>
                <View style={{ flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' }}>
                  {(['emoji', 'stickers'] as const).map((tab) => (
                    <Pressable
                      key={tab}
                      onPress={() => setEmojiTab(tab)}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        alignItems: 'center',
                        borderBottomWidth: 2,
                        borderBottomColor: emojiTab === tab ? '#FF9F6E' : 'transparent',
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600', color: emojiTab === tab ? '#FF9F6E' : '#9CA3AF' }}>
                        {tab === 'emoji' ? t.chat.sticker_tab_emoji : t.chat.sticker_tab_mine}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {emojiTab === 'emoji' ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 8 }}>
                    {COMMON_EMOJI.map((emoji) => (
                      <Pressable
                        key={emoji}
                        onPress={() => setDraftMessage((prev) => prev + emoji)}
                        style={{ width: '12.5%', alignItems: 'center', paddingVertical: 6 }}
                      >
                        <Text style={{ fontSize: 24 }}>{emoji}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 8 }}>
                    {/* "+" button to add new sticker from photo library */}
                    <Pressable
                      onPress={() => void handleAddSticker()}
                      disabled={uploadingSticker}
                      style={{ width: '25%', aspectRatio: 1, padding: 4 }}
                    >
                      <View
                        style={{
                          flex: 1,
                          borderRadius: 8,
                          backgroundColor: '#F3F6FC',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1.5,
                          borderColor: '#D1D5DB',
                          borderStyle: 'dashed',
                        }}
                      >
                        {uploadingSticker ? (
                          <ActivityIndicator size="small" color="#FF9F6E" />
                        ) : (
                          <Ionicons name="add" size={28} color="#9CA3AF" />
                        )}
                      </View>
                    </Pressable>
                    {(stickersQuery.data ?? []).map((sticker) => (
                      <Pressable
                        key={sticker.id}
                        onPress={() => void handleSendSticker(sticker.media_url)}
                        style={{ width: '25%', aspectRatio: 1, padding: 4 }}
                      >
                        <Image
                          source={resolveMediaUrl(sticker.media_url) ?? sticker.media_url}
                          style={{ flex: 1, borderRadius: 8 }}
                          contentFit="contain"
                        />
                      </Pressable>
                    ))}
                    {(stickersQuery.data?.length ?? 0) === 0 && !stickersQuery.isLoading ? (
                      <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 14, justifyContent: 'center' }}>
                        <Text style={{ fontSize: 13, color: '#9CA3AF' }}>{t.chat.sticker_empty}</Text>
                      </View>
                    ) : null}
                  </View>
                )}
              </View>
            ) : null}

            {/* + Panel */}
            {isPlusVisible ? (
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: '#E5E7EB',
                  padding: 20,
                  paddingBottom: chatBottomInset + 16,
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 16,
                }}
              >
                {[
                  { icon: 'images-outline' as const, label: t.chat.panel_photos, onPress: () => void handlePickImage() },
                  { icon: 'camera-outline' as const, label: t.chat.panel_camera, onPress: () => setIsPlusVisible(false) },
                  { icon: 'call-outline' as const, label: t.chat.panel_audio_call, onPress: () => setIsPlusVisible(false) },
                  { icon: 'map-outline' as const, label: t.chat.panel_map, onPress: () => setIsPlusVisible(false) },
                  { icon: 'document-text-outline' as const, label: t.chat.panel_memo, onPress: () => setIsPlusVisible(false) },
                ].map((item) => (
                  <Pressable
                    key={item.label}
                    onPress={item.onPress}
                    style={{ width: 72, alignItems: 'center', gap: 6 }}
                  >
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 16,
                        backgroundColor: '#F3F6FC',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name={item.icon} size={26} color="#374151" />
                    </View>
                    <Text style={{ fontSize: 11, color: '#6B7280', textAlign: 'center' }}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </KeyboardAvoidingView>

          {/* ── Context menu (positioned near message) ── */}
          {(() => {
            const msg = contextMenu.message;
            if (!contextMenu.visible || !msg) return null;
            const isMe = contextMenu.isMe;
            const withinHour = (Date.now() - new Date(msg.created_at).getTime()) < 3_600_000;
            const row1: MenuAction[] = [
              msg.type === 'image' || msg.type === 'sticker'
                ? { id: 'save', icon: 'bookmark-outline', label: t.chat.action_save_sticker }
                : { id: 'copy', icon: 'copy-outline', label: t.chat.copy_message },
              { id: 'forward', icon: 'arrow-redo-outline', label: t.chat.action_forward },
              { id: 'favorite', icon: favoritedIds.has(msg.id) ? 'star' : 'star-outline', label: t.chat.action_favorite },
              { id: 'quote', icon: 'chatbox-ellipses-outline', label: t.chat.action_quote },
              { id: 'select', icon: 'checkmark-circle-outline', label: t.chat.action_multi_select },
            ];
            const row2: MenuAction[] = [
              { id: 'delete', icon: 'trash-outline', label: t.chat.delete_message, destructive: true },
              { id: 'related', icon: 'happy-outline', label: t.chat.action_related },
              { id: 'remind', icon: 'alarm-outline', label: t.chat.action_remind },
              { id: 'screenshot', icon: 'camera-outline', label: t.chat.action_screenshot },
              ...(isMe && msg.type === 'text' && withinHour
                ? [{ id: 'edit', icon: 'pencil-outline' as const, label: t.chat.action_edit }]
                : []),
            ];
            return (
              <MessageActionMenu
                visible
                pageY={contextMenu.pageY}
                pageX={contextMenu.pageX}
                row1={row1}
                row2={row2}
                onAction={handleMenuAction}
                onClose={closeContextMenu}
              />
            );
          })()}

          {/* ── Toast overlay ── */}
          {toastMsg ? (
            <View
              style={{
                position: 'absolute',
                bottom: chatBottomInset + 72,
                left: 0,
                right: 0,
                alignItems: 'center',
                zIndex: 400,
                pointerEvents: 'none',
              }}
            >
              <View style={{ backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 9 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>{toastMsg}</Text>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>

      {/* ── Forward modal ── */}
      <Modal visible={isForwardVisible} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setIsForwardVisible(false)}>
        <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right, backgroundColor: '#F6F7FB' }}>
          <View className="flex-row items-center justify-between px-5 pb-4 pt-4">
            <Pressable onPress={() => setIsForwardVisible(false)}>
              <Ionicons name="close" size={28} color="#111827" />
            </Pressable>
            <Text className="text-[22px] font-extrabold text-slate-900">{t.chat.forward_title}</Text>
            <View style={{ width: 28 }} />
          </View>
          <ScrollView className="flex-1 px-5">
            <View className="overflow-hidden rounded-[28px] bg-white" style={styles.panelCard}>
              {conversations.map((item, index) => (
                <View key={item.id}>
                  <Pressable
                    onPress={async () => {
                      if (!forwardMessage) return;
                      setIsForwardVisible(false);
                      const targetId = item.conversationId ?? (await (async () => {
                        if (item.kind === 'self') { const r = await api.get('/chat/conversations/self'); return (r.data.data as ChatConversation).id; }
                        if (item.kind === 'direct' && item.friendUserId) { const r = await api.get(`/chat/conversations/direct/${item.friendUserId}`); return (r.data.data as ChatConversation).id; }
                        if (item.kind === 'group' && item.groupId) { const r = await api.get(`/chat/conversations/group/${item.groupId}`); return (r.data.data as ChatConversation).id; }
                        return null;
                      })());
                      if (!targetId) return;
                      await api.post(`/chat/conversations/${targetId}/messages`, {
                        type: forwardMessage.type,
                        body: forwardMessage.body,
                        media_url: forwardMessage.media_url,
                        meta: { forwarded: true },
                      });
                      showToast(t.chat.toast_forwarded);
                    }}
                    className="flex-row items-center px-5 py-4"
                    style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                  >
                    <ConversationAvatar item={item} />
                    <Text className="ml-4 flex-1 text-[17px] font-semibold text-slate-900" numberOfLines={1}>{item.title}</Text>
                    <Ionicons name="arrow-redo-outline" size={20} color="#FF9F6E" />
                  </Pressable>
                  {index < conversations.length - 1 ? <View className="ml-[92px] h-px bg-slate-100" /> : null}
                </View>
              ))}
            </View>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* ── Image lightbox ── */}
      <Modal
        visible={lightboxUrl !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxUrl(null)}
        statusBarTranslucent
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.96)', justifyContent: 'center', alignItems: 'center' }}>
          <Pressable
            style={{ position: 'absolute', top: 52, right: 20, zIndex: 10, padding: 4 }}
            hitSlop={12}
            onPress={() => setLightboxUrl(null)}
          >
            <Ionicons name="close-circle" size={38} color="rgba(255,255,255,0.85)" />
          </Pressable>
          <Pressable style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }} onPress={() => setLightboxUrl(null)}>
            {lightboxUrl ? (
              <Image
                source={lightboxUrl}
                style={{ width: '100%', height: '100%' }}
                contentFit="contain"
              />
            ) : null}
          </Pressable>
        </View>
      </Modal>

      {/* ── Create meetup modal ── */}
      <Modal visible={isCreateMeetupVisible} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setIsCreateMeetupVisible(false)}>
        <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right, backgroundColor: '#F6F7FB' }}>
          <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View className="flex-row items-center justify-between px-5 pb-4 pt-4">
              <Pressable onPress={() => setIsCreateMeetupVisible(false)}>
                <Ionicons name="close" size={28} color="#111827" />
              </Pressable>
              <Text className="text-[22px] font-extrabold text-slate-900">{t.social.create_event}</Text>
              <View style={{ width: 28 }} />
            </View>

            <ScrollView className="flex-1 px-5" keyboardShouldPersistTaps="handled">
              <View className="rounded-[24px] bg-white px-4 py-4" style={styles.panelCard}>
                <TextInput
                  value={eventTitle}
                  onChangeText={setEventTitle}
                  placeholder={t.social.event_title}
                  placeholderTextColor="#94A3B8"
                  className="rounded-[18px] bg-[#F3F6FC] px-4 py-3 text-[16px] text-slate-900"
                />
                <View className="mt-3">
                  <PlacePicker
                    value={eventPlace}
                    onChange={setEventPlace}
                    placeholder={t.social.event_place}
                  />
                </View>
                <View className="mt-3">
                  <DateTimeRangePicker
                    value={eventTimeRange}
                    onChange={setEventTimeRange}
                    placeholder={t.social.event_start_date}
                    minDate={new Date()}
                  />
                </View>
              </View>

              <Pressable
                onPress={() => void handleCreateMeetup()}
                disabled={
                  !eventTitle.trim() ||
                  !eventPlace ||
                  !eventTimeRange.start ||
                  !eventTimeRange.end ||
                  createGroupEvent.isPending
                }
                className="mb-8 mt-5 items-center rounded-[24px] px-5 py-4"
                style={{
                  backgroundColor:
                    !eventTitle.trim() ||
                    !eventPlace ||
                    !eventTimeRange.start ||
                    !eventTimeRange.end ||
                    createGroupEvent.isPending
                      ? '#D6DBF2'
                      : '#FF385C',
                }}
              >
                <Text className="text-[16px] font-extrabold text-white">
                  {createGroupEvent.isPending ? t.common.loading : t.social.event_create_submit}
                </Text>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    shadowColor: '#101828',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  searchShell: {
    shadowColor: '#101828',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  panelCard: {
    shadowColor: '#101828',
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  menuCard: {
    shadowColor: '#111827',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  groupAvatarFront: {
    position: 'absolute',
    left: 0,
    bottom: 0,
  },
  groupAvatarBack: {
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
