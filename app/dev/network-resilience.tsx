import { View, Text, Pressable } from 'react-native';

import { PageHeader } from '../../components/PageHeader';
import { Screen } from '../../components/Screen';
import { NetworkHealthBanner } from '../../components/NetworkHealthBanner';
import { CommentRow } from '../../features/community/CommunityPostComments';
import { MessageBubble } from '../(tabs)/social';
import type { CommunityComment } from '../../features/community/useCommunity';
import type { ChatMessage } from '../../features/chat/useChat';
import { useNetworkHealthStore } from '../../store/networkHealthStore';

/**
 * Verification gallery for the弱网 (weak-network) resilience change (MS-16,
 * D-035). Renders the REAL CommentRow / MessageBubble / NetworkHealthBanner
 * in every send state so the 6-state check (normal / long-German / empty /
 * loading / self / other) can be eyeballed on Expo Web without a backend.
 * Dev-only: English, out of the i18n pipeline (same convention as
 * button-audit / components).
 */

const LONG_DE =
  'Ich habe dir gerade die Bestätigung für den Anmeldung-Termin bei der Ausländerbehörde weitergeleitet — sag Bescheid, ob es passt.';

const noop = () => {};

function baseComment(over: Partial<CommunityComment>): CommunityComment {
  return {
    id: over.id ?? 'c1',
    body: over.body ?? 'This is a normal published comment.',
    source_language: 'en',
    translated_body: null,
    is_translated: false,
    moderation_status: 'approved',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    author: {
      id: 'u1',
      display_name: 'Mira Chen',
      avatar_url: null,
      city: 'Berlin',
      identity: 'newcomer',
    },
    parent_comment_id: null,
    reply_to_user_id: null,
    reply_to_user_name: null,
    helpful_count: 3,
    viewer_marked_helpful: false,
    reply_count: 0,
    viewer_reaction: null,
    reaction_summary: [],
    ...over,
  };
}

function baseMessage(over: Partial<ChatMessage>): ChatMessage {
  return {
    id: over.id ?? 'm1',
    sender: over.sender ?? { id: 'me', display_name: 'You', avatar_url: null },
    type: 'text',
    body: over.body ?? 'Hey! Are we still on for tomorrow?',
    media_url: null,
    meta: null,
    created_at: new Date().toISOString(),
    ...over,
  };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="rounded-3xl bg-white p-5">
      <Text className="text-xs font-extrabold uppercase tracking-wide text-text-subtle">{title}</Text>
      <View className="mt-4 gap-4">{children}</View>
    </View>
  );
}

const bubbleCommon = {
  userAvatar: null,
  userDisplayName: 'You',
  onImagePress: noop,
  onLongPress: noop,
  editedLabel: 'edited',
  deletedLabel: 'This message was deleted',
  sendingLabel: 'Sending…',
  failedLabel: 'Not delivered · tap to retry',
  onRetry: noop,
};

export default function NetworkResilienceGallery() {
  const reportFailure = useNetworkHealthStore((s) => s.reportFailure);
  const reportSuccess = useNetworkHealthStore((s) => s.reportSuccess);
  const isDegraded = useNetworkHealthStore((s) => s.isDegraded);

  return (
    <Screen
      header={<PageHeader title="Network resilience" subtitle="Weak-network send states (MS-16 / D-035)" />}
      scroll
      bottomGap={28}
      contentClassName="px-5 gap-4"
    >
      <Section title="NetworkHealthBanner — degraded toggle">
        <NetworkHealthBanner />
        <Text className="text-sm text-text-secondary">
          isDegraded = {String(isDegraded)} (banner shows above only when true)
        </Text>
        <View className="flex-row gap-3">
          <Pressable
            onPress={() => {
              reportFailure();
              reportFailure();
              reportFailure();
            }}
            className="rounded-full bg-neutral-800 px-4 py-2"
          >
            <Text className="text-sm font-bold text-white">Simulate weak network</Text>
          </Pressable>
          <Pressable onPress={() => reportSuccess()} className="rounded-full bg-neutral-200 px-4 py-2">
            <Text className="text-sm font-bold text-neutral-800">Reset</Text>
          </Pressable>
        </View>
      </Section>

      <Section title="Chat bubble — send states (self)">
        <MessageBubble message={baseMessage({ id: 'm-sent', body: 'Sent — normal.' })} isMe {...bubbleCommon} />
        <MessageBubble
          message={baseMessage({ id: 'm-pending', body: 'Pending — optimistic.', _pending: true })}
          isMe
          {...bubbleCommon}
        />
        <MessageBubble
          message={baseMessage({ id: 'm-failed', body: 'Failed — tap to retry.', _failed: true })}
          isMe
          {...bubbleCommon}
        />
        <MessageBubble message={baseMessage({ id: 'm-longde', body: LONG_DE, _pending: true })} isMe {...bubbleCommon} />
      </Section>

      <Section title="Chat bubble — received (other)">
        <MessageBubble
          message={baseMessage({
            id: 'm-other',
            body: 'A message from someone else.',
            sender: { id: 'u1', display_name: 'Mira Chen', avatar_url: null },
          })}
          isMe={false}
          {...bubbleCommon}
        />
      </Section>

      <Section title="Comment row — states">
        <CommentRow
          comment={baseComment({ id: 'c-normal', body: 'A normal published comment.' })}
          isOwn={false}
          langCode="en"
          translateOverridden={false}
          onPressReply={noop}
          onPressHelpful={noop}
          onPressTranslate={noop}
          onPressMore={noop}
        />
        <CommentRow
          comment={baseComment({ id: 'c-pending', body: 'An optimistic comment still sending.', _pending: true })}
          isOwn
          langCode="en"
          translateOverridden={false}
          onPressReply={noop}
          onPressHelpful={noop}
          onPressTranslate={noop}
          onPressMore={noop}
        />
        <CommentRow
          comment={baseComment({ id: 'c-longde', body: LONG_DE, _pending: true })}
          isOwn
          langCode="de"
          translateOverridden={false}
          onPressReply={noop}
          onPressHelpful={noop}
          onPressTranslate={noop}
          onPressMore={noop}
        />
        <CommentRow
          comment={baseComment({
            id: 'c-reply',
            body: 'A reply to another user.',
            parent_comment_id: 'c-normal',
            reply_to_user_name: 'Mira Chen',
          })}
          isOwn={false}
          langCode="en"
          translateOverridden={false}
          isReply
          onPressReply={noop}
          onPressHelpful={noop}
          onPressTranslate={noop}
          onPressMore={noop}
        />
      </Section>
    </Screen>
  );
}
