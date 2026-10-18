import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import { openExternalUrl } from '../../lib/links';
import {
  bannerItems,
  formatDeadline,
  formatStart,
  placeLine,
  type InfoUpdate,
  type PostWithUpdates,
} from '../../lib/postUpdates';

/**
 * What the post's source changed after it was published (D-171). It sits above
 * everything else in the detail view because the body below still says the
 * old thing: the body is never rewritten, so this is where the reader learns
 * which value is current.
 */
export function PostUpdateBanner({ post }: { post: PostWithUpdates }) {
  const { t, langCode } = useLanguage();
  const items = bannerItems(post);
  if (items.length === 0) return null;

  const alarming = items.some((item) => item.kind === 'cancelled' || item.kind === 'gone');
  const pageUrl = items.find((item) => item.page_url)?.page_url ?? null;
  const tone = alarming
    ? { bg: '#FDECEC', border: 'rgba(200,30,58,0.25)', fg: '#C81E3A', icon: 'alert-circle' as const }
    : { bg: '#FFF4E0', border: 'rgba(176,122,30,0.3)', fg: '#8A5A12', icon: 'refresh-circle' as const };

  return (
    <View
      className="mx-5 mt-3 rounded-[20px] px-4 py-3"
      style={{ backgroundColor: tone.bg, borderWidth: 1, borderColor: tone.border }}
      testID="post.info-update-banner"
    >
      {items.map((item, index) => (
        <View key={`${item.kind}-${index}`} className={index > 0 ? 'mt-2' : undefined}>
          <View className="flex-row items-start">
            <Ionicons name={tone.icon} size={16} color={tone.fg} style={{ marginTop: 2 }} />
            <Text className="ml-2 flex-1 text-[14px] font-bold leading-5" style={{ color: tone.fg }}>
              {headline(item, t, langCode)}
            </Text>
          </View>
          {was(item, t, langCode) ? (
            <Text className="ml-6 mt-0.5 text-[12px] leading-4 text-neutral-500">
              {was(item, t, langCode)}
            </Text>
          ) : null}
        </View>
      ))}
      <Text className="ml-6 mt-2 text-[12px] leading-4 text-neutral-500">
        {t.plaza.info_banner_body_note}
      </Text>
      {pageUrl ? (
        <Pressable
          onPress={() => void openExternalUrl(pageUrl)}
          className="ml-6 mt-2 self-start"
          accessibilityRole="link"
        >
          <Text className="text-[13px] font-bold" style={{ color: tone.fg }}>
            {t.plaza.info_banner_open_page} →
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type Copy = ReturnType<typeof useLanguage>['t'];

function headline(item: InfoUpdate, t: Copy, langCode: string): string {
  switch (item.kind) {
    case 'time':
      return item.after.starts_at
        ? t.plaza.info_banner_time.replace('{when}', formatStart(item.after.starts_at, item.after.timed, langCode))
        : t.plaza.info_tag_time;
    case 'deadline':
      return item.after.deadline
        ? t.plaza.info_banner_deadline.replace('{when}', formatDeadline(item.after.deadline, langCode))
        : t.plaza.info_tag_deadline;
    case 'place': {
      const place = placeLine(item.after);
      return place ? t.plaza.info_banner_place.replace('{place}', place) : t.plaza.info_tag_place;
    }
    case 'cancelled':
      return t.plaza.info_banner_cancelled;
    case 'gone':
      return t.plaza.info_banner_gone;
  }
}

function was(item: InfoUpdate, t: Copy, langCode: string): string | null {
  if (item.kind === 'time' && item.before.starts_at) {
    return t.plaza.info_banner_was.replace(
      '{when}',
      formatStart(item.before.starts_at, item.before.timed, langCode),
    );
  }
  if (item.kind === 'deadline' && item.before.deadline) {
    return t.plaza.info_banner_was.replace('{when}', formatDeadline(item.before.deadline, langCode));
  }
  if (item.kind === 'place') {
    const place = placeLine(item.before);
    return place ? t.plaza.info_banner_was.replace('{when}', place) : null;
  }
  return null;
}
