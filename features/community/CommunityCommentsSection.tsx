import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import { resolveMediaUrl } from '../../lib/media';
import { TranslatedText } from './TranslatedText';
import { CommunityPost, useCommunityComments } from './useCommunity';

interface Props {
  post: CommunityPost;
  onReplyToAuthor?: (authorName: string) => void;
}

function formatCommentDate(value: string, langCode: string) {
  try {
    return new Intl.DateTimeFormat(langCode, {
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const resolvedAvatarUrl = resolveMediaUrl(avatarUrl);

  if (resolvedAvatarUrl) {
    return (
      <Image
        source={resolvedAvatarUrl}
        contentFit="cover"
        style={{ width: 38, height: 38, borderRadius: 19 }}
      />
    );
  }

  return (
    <View
      className="items-center justify-center rounded-full"
      style={{ width: 38, height: 38, backgroundColor: '#FFE6EA' }}
    >
      <Text style={{ color: '#F47C7C', fontSize: 14, fontWeight: '700' }}>
        {name.trim().slice(0, 1).toUpperCase() || 'N'}
      </Text>
    </View>
  );
}

export function CommunityCommentsSection({ post, onReplyToAuthor }: Props) {
  const { t, langCode } = useLanguage();
  const comments = useCommunityComments(post.id, true);

  if (comments.isLoading) {
    return (
      <View className="py-8">
        <ActivityIndicator size="small" color="#F47C7C" />
      </View>
    );
  }

  if (!comments.data?.length) {
    return <Text className="pb-8 text-sm text-neutral-400">{t.plaza.comments_empty}</Text>;
  }

  return (
    <View>
      {comments.data.map((comment, index) => {
        const detailLine = [formatCommentDate(comment.created_at, langCode), comment.author.city]
          .filter(Boolean)
          .join(' · ');

        return (
          <View
            key={comment.id}
            className={`${index === comments.data.length - 1 ? 'pb-2' : 'border-b border-neutral-100 pb-5'} flex-row gap-3 pt-1`}
          >
            <Avatar name={comment.author.display_name} avatarUrl={comment.author.avatar_url} />
            <View className="flex-1">
              <Text className="text-[15px] font-semibold text-black">{comment.author.display_name}</Text>

              <TranslatedText
                originalText={comment.body}
                translatedText={comment.translated_body}
                sourceLanguage={comment.source_language}
                textClassName="mt-1 text-[15px] leading-6 text-neutral-800"
              />

              <View className="mt-2 flex-row flex-wrap items-center gap-3">
                <Text className="text-[12px] text-neutral-400">{detailLine}</Text>

                {onReplyToAuthor ? (
                  <Pressable
                    className="flex-row items-center"
                    onPress={() => onReplyToAuthor(comment.author.display_name)}
                  >
                    <Ionicons name="arrow-undo-outline" size={13} color="#6B7280" />
                  </Pressable>
                ) : null}

                {comment.moderation_status !== 'approved' ? (
                  <Text className="text-[12px] font-medium text-[#FF9F0A]">
                    {t.plaza.moderation_review}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}
