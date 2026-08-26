import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import { CalendarItem, dayKey, groupByDay } from '../../features/odyssey/calendarItems';
import { useCalendarWithDevice } from '../../features/odyssey/useOdysseyCalendar';
import { CalendarMonth } from '../datetime/CalendarMonth';

/**
 * The calendar at the top of the Odyssey tab (D-083): every saved event,
 * every planned visit, every application deadline — and, once connected, the
 * phone calendar's own events (which is where Google Calendar lives on the
 * device). Tapping a day lists it; tapping an entry opens its post.
 */

const CORAL = '#F47C7C';
const AMBER = '#D97706';

export interface OdysseyCalendarPreview {
  items: CalendarItem[];
  loading?: boolean;
}

export function OdysseyCalendarSection({ preview }: { preview?: OdysseyCalendarPreview }) {
  const { t, langCode } = useLanguage();
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState<Date>(today);
  const [selected, setSelected] = useState<Date>(today);
  const live = useCalendarWithDevice(month);
  // The dev gallery drives the section with fixed data; hooks still run (the
  // rules of hooks demand it) but their output is ignored in preview.
  const server = preview ? { isLoading: preview.loading ?? false } : live.server;
  const device = preview ? { supported: false, hydrated: true, enabled: false, events: [], connect: async () => false, disconnect: async () => undefined } : live.device;
  const items = preview ? preview.items : live.items;

  const byDay = useMemo(() => groupByDay(items), [items]);
  const marked = useMemo(() => new Set(byDay.keys()), [byDay]);
  const dayItems = byDay.get(dayKey(selected)) ?? [];

  const timeLabel = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(langCode, { hour: '2-digit', minute: '2-digit' }).format(
        new Date(iso),
      );
    } catch {
      return new Date(iso).toTimeString().slice(0, 5);
    }
  };

  const openItem = (item: CalendarItem) => {
    if (item.post_id) {
      router.push(`/p/${item.post_id}` as never);
    }
  };

  return (
    <View style={styles.wrap} testID="odyssey-calendar">
      <CalendarMonth
        month={month}
        onMonthChange={(next) => {
          setMonth(next);
          setSelected(next);
        }}
        selected={selected}
        onSelect={setSelected}
        markedDates={marked}
      />

      <View style={styles.dayList}>
        {server.isLoading ? (
          <Text style={styles.emptyText}>{t.common.loading}</Text>
        ) : dayItems.length === 0 ? (
          <Text style={styles.emptyText}>
            {marked.size === 0
              ? t.odyssey_calendar.empty_month
              : t.odyssey_calendar.empty_day}
          </Text>
        ) : (
          dayItems.map((item, index) => (
            <Pressable
              key={`${item.source}-${item.post_id ?? item.personal_odyssey_id ?? index}-${item.kind}-${item.date}`}
              onPress={() => openItem(item)}
              disabled={!item.post_id}
              accessibilityRole={item.post_id ? 'button' : 'text'}
              style={styles.itemRow}
            >
              <View
                style={[
                  styles.itemDot,
                  item.kind === 'deadline' ? styles.deadlineDot : null,
                  item.source === 'device' ? styles.deviceDot : null,
                ]}
              />
              <Text style={styles.itemTime}>{timeLabel(item.date)}</Text>
              <Text style={styles.itemTitle} numberOfLines={1}>
                {item.title}
              </Text>
              {item.kind === 'deadline' ? (
                <Text style={styles.deadlineChip}>{t.odyssey_calendar.deadline_chip}</Text>
              ) : null}
              {item.source === 'device' ? (
                <Ionicons name="phone-portrait-outline" size={13} color="#94A3B8" />
              ) : null}
            </Pressable>
          ))
        )}
      </View>

      {device.supported && device.hydrated ? (
        <Pressable
          onPress={() => (device.enabled ? device.disconnect() : device.connect())}
          accessibilityRole="button"
          style={styles.deviceRow}
          testID="odyssey-calendar.device-toggle"
        >
          <Ionicons
            name={device.enabled ? 'checkmark-circle' : 'calendar-outline'}
            size={16}
            color={device.enabled ? '#16A34A' : '#94A3B8'}
          />
          <Text style={styles.deviceLabel}>
            {device.enabled
              ? t.odyssey_calendar.device_connected
              : t.odyssey_calendar.device_connect}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
    gap: 10,
  },
  dayList: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    paddingVertical: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 30,
  },
  itemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: CORAL,
  },
  deadlineDot: {
    backgroundColor: AMBER,
  },
  deviceDot: {
    backgroundColor: '#94A3B8',
  },
  itemTime: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    minWidth: 44,
  },
  itemTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  deadlineChip: {
    fontSize: 11,
    fontWeight: '700',
    color: AMBER,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  deviceLabel: {
    fontSize: 12,
    color: '#64748B',
  },
});
