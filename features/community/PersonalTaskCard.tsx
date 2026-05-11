import { Linking, Pressable, Text, View } from 'react-native';

import { StackedButton } from '../../components/StackedButton';
import { useLanguage } from '../../context/LanguageContext';
import { formatDisplayLocation } from '../../lib/displayLocation';
import { colors } from '../../theme/tokens';
import { TranslatedText } from './TranslatedText';
import {
  PersonalOdyssey,
  useCompletePersonalOdyssey,
  useStartPersonalOdyssey,
} from './useCommunity';

interface Props {
  task: PersonalOdyssey;
}

function formatDate(value: string | null | undefined, langCode: string) {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat(langCode, { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return value;
  }
}

function metadataString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null;
}

export function PersonalOdysseyCard({ task }: Props) {
  const { t, langCode } = useLanguage();
  const isSocialEvent = task.origin === 'social_event';
  if (isSocialEvent) {
    return <SocialEventCard task={task} langCode={langCode} t={t} />;
  }
  return <LocationQuestCard task={task} t={t} />;
}

function LocationQuestCard({ task, t }: { task: PersonalOdyssey; t: ReturnType<typeof useLanguage>['t'] }) {
  const start = useStartPersonalOdyssey();
  const complete = useCompletePersonalOdyssey();
  const placeName = metadataString(task.metadata_json?.['place_name']);
  const groupName = metadataString(task.metadata_json?.['group_name']);
  const venueSummary = metadataString(task.metadata_json?.['venue_summary']);
  const openingHoursText = metadataString(task.metadata_json?.['opening_hours_text']);
  const busyHoursText = metadataString(task.metadata_json?.['busy_hours_text']);
  const mapUrl = metadataString(task.metadata_json?.['map_url']) ?? task.source_url ?? null;
  const displayPlaceName =
    formatDisplayLocation(placeName) ?? placeName ?? formatDisplayLocation(groupName) ?? groupName;
  const showInfoBubble = Boolean(venueSummary || openingHoursText || busyHoursText);

  return (
    <View
      style={{
        borderRadius: 28,
        backgroundColor: '#FAF6FF',
        borderWidth: 1,
        borderColor: 'rgba(221,212,238,0.72)',
        shadowColor: '#7A4A2C',
        shadowOpacity: 0.1,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 14 },
        elevation: 6,
      }}
    >
      <View style={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16 }}>
        <View className="mb-3 flex-row items-start gap-3">
          <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: '#FFE8DA' }}>
            <Text className="text-[11px] font-extrabold uppercase tracking-[0.8px]" style={{ color: colors.brandCoral }}>
              {t.tasks.type_side}
            </Text>
          </View>
          <View className="flex-1">
            <View className="mb-2 h-1.5 w-16 rounded-full" style={{ backgroundColor: colors.brandCoral }} />
            <TranslatedText
              originalText={task.title}
              translatedText={task.translated_title}
              sourceLanguage={task.source_language}
              textClassName="text-[17px] font-extrabold leading-6 text-gray-900"
            />
            {task.description ? (
              <TranslatedText
                originalText={task.description}
                translatedText={task.translated_description}
                sourceLanguage={task.source_language}
                textClassName="mt-2 text-sm leading-6 text-gray-500"
              />
            ) : null}
          </View>
        </View>

        {showInfoBubble ? (
          <View className="mb-4 rounded-[20px] px-3 py-3" style={{ backgroundColor: '#FFE8DA' }}>
            {venueSummary ? (
              <Text className="text-sm leading-5" style={{ color: colors.textMain }}>
                {venueSummary}
              </Text>
            ) : null}
            {openingHoursText ? (
              <Text
                className={`${venueSummary ? 'mt-2' : ''} text-xs font-semibold`}
                style={{ color: colors.brandCoral }}
              >
                {openingHoursText}
              </Text>
            ) : null}
            {busyHoursText ? (
              <Text
                className={`${venueSummary || openingHoursText ? 'mt-1' : ''} text-xs`}
                style={{ color: colors.brandCoral }}
              >
                {busyHoursText}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View className="flex-row flex-wrap items-center gap-3">
          {displayPlaceName ? (
            <View className="flex-row flex-wrap items-center gap-2">
              <Pressable
              className="rounded-full px-3 py-2"
              style={{ backgroundColor: '#FFE8DA' }}
              onPress={() => {
                if (mapUrl) {
                  void Linking.openURL(mapUrl);
                }
              }}
              disabled={!mapUrl}
            >
              <Text className="text-xs font-bold" style={{ color: colors.brandCoral }}>
                📍 {displayPlaceName}
              </Text>
              </Pressable>
            </View>
          ) : null}

          <View className="flex-row flex-wrap items-center gap-3">
            {task.status === 'available' ? (
            <StackedButton
              label={t.tasks.start}
              onPress={() => start.mutate(task.id)}
              loading={start.isPending}
              variant="primary"
              size="xs"
            />
          ) : null}

            {task.status === 'in_progress' ? (
            <StackedButton
              label={t.tasks.complete}
              onPress={() => complete.mutate(task.id)}
              loading={complete.isPending}
              variant="success"
              size="xs"
            />
          ) : null}

            {task.status === 'done' ? (
            <View className="rounded-full bg-success/10 px-4 py-2">
              <Text className="text-sm font-extrabold text-success">{t.tasks.done}</Text>
            </View>
          ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

function SocialEventCard({
  task,
  langCode,
  t,
}: {
  task: PersonalOdyssey;
  langCode: string;
  t: ReturnType<typeof useLanguage>['t'];
}) {
  const start = useStartPersonalOdyssey();
  const complete = useCompletePersonalOdyssey();
  const eventName = metadataString(task.metadata_json?.['event_name']);
  const groupName = metadataString(task.metadata_json?.['group_name']);
  const placeName = metadataString(task.metadata_json?.['place_name']);
  const locationHint = metadataString(task.metadata_json?.['location_hint']);
  const eventTimeHint = metadataString(task.metadata_json?.['event_time_hint']);
  const eventStartDate = formatDate(metadataString(task.metadata_json?.['event_starts_at']), langCode);
  const displayEventName = formatDisplayLocation(eventName) ?? eventName;
  const displayGroupName = formatDisplayLocation(groupName) ?? groupName;
  const displayPlaceName = formatDisplayLocation(placeName) ?? placeName;
  const displayLocationHint = formatDisplayLocation(locationHint) ?? locationHint;

  return (
    <View
      style={{
        borderRadius: 28,
        backgroundColor: '#FAF6FF',
        borderWidth: 1,
        borderColor: 'rgba(221,212,238,0.72)',
        shadowColor: '#7A4A2C',
        shadowOpacity: 0.1,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 14 },
        elevation: 6,
      }}
    >
      <View style={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16 }}>
        <View className="mb-3 flex-row items-start gap-3">
          <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: '#FFE8DA' }}>
            <Text className="text-[11px] font-extrabold uppercase tracking-[0.8px]" style={{ color: colors.brandCoral }}>
              {t.tasks.type_side}
            </Text>
          </View>
          <View className="flex-1">
            <View className="mb-2 h-1.5 w-16 rounded-full" style={{ backgroundColor: colors.brandCoral }} />
            <TranslatedText
              originalText={task.title}
              translatedText={task.translated_title}
              sourceLanguage={task.source_language}
              textClassName="text-[17px] font-extrabold leading-6 text-gray-900"
            />
            {task.description ? (
              <TranslatedText
                originalText={task.description}
                translatedText={task.translated_description}
                sourceLanguage={task.source_language}
                textClassName="mt-2 text-sm leading-6 text-gray-500"
              />
            ) : null}
          </View>
        </View>

        {displayGroupName || displayEventName || displayPlaceName || displayLocationHint || eventTimeHint ? (
          <View className="mb-4 rounded-[20px] px-3 py-3" style={{ backgroundColor: '#FFE8DA' }}>
            {displayGroupName ? (
              <Text className="mb-1 text-xs font-semibold" style={{ color: colors.brandCoral }}>
                {t.social.group_name_label}: {displayGroupName}
              </Text>
            ) : null}
            {displayEventName ? (
              <Text className="mb-1 text-xs font-semibold" style={{ color: colors.brandCoral }}>
                {t.plaza.task_card_event}: {displayEventName}
              </Text>
            ) : null}
            {displayPlaceName ? (
              <Text className="mb-1 text-xs font-semibold" style={{ color: colors.brandCoral }}>
                {t.plaza.task_card_place}: {displayPlaceName}
              </Text>
            ) : null}
            {displayLocationHint ? (
              <Text className="mb-1 text-xs" style={{ color: colors.brandCoral }}>
                {t.plaza.task_card_location}: {displayLocationHint}
              </Text>
            ) : null}
            {eventTimeHint ? (
              <Text className="text-xs" style={{ color: colors.brandCoral }}>
                {t.plaza.task_card_time}: {eventTimeHint}
              </Text>
            ) : null}
          </View>
        ) : null}

        {eventStartDate ? (
          <View className="mb-4 flex-row flex-wrap gap-2">
            <View className="rounded-full px-3 py-2" style={{ backgroundColor: '#FFE8DA' }}>
              <Text className="text-xs font-medium" style={{ color: colors.brandCoral }}>{eventStartDate}</Text>
            </View>
          </View>
        ) : null}

        <View className="flex-row flex-wrap items-center gap-2">
          {task.status === 'available' ? (
            <StackedButton
              label={t.tasks.start}
              onPress={() => start.mutate(task.id)}
              loading={start.isPending}
              variant="primary"
              size="xs"
            />
          ) : null}

          {task.status === 'in_progress' ? (
            <StackedButton
              label={t.tasks.complete}
              onPress={() => complete.mutate(task.id)}
              loading={complete.isPending}
              variant="success"
              size="xs"
            />
          ) : null}

          {task.status === 'done' ? (
            <View className="rounded-full bg-success/10 px-4 py-2">
              <Text className="text-sm font-extrabold text-success">{t.tasks.done}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
