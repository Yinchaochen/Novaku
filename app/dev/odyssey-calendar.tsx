import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { PageHeader } from '../../components/PageHeader';
import { Screen } from '../../components/Screen';
import {
  OdysseyCalendarSection,
  type OdysseyCalendarPreview,
} from '../../components/odyssey/OdysseyCalendarSection';
import { PlanWhenSheet } from '../../components/odyssey/PlanWhenSheet';
import { type CalendarItem } from '../../features/odyssey/calendarItems';
import { colors } from '../../theme/tokens';

/**
 * Dev gallery: the Odyssey calendar in its risky states (D-083).
 * Dev-only copy stays English and out of the i18n pipeline.
 */

function at(hour: number, dayOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

const TODAY_ITEMS: CalendarItem[] = [
  { date: at(9), kind: 'deadline', title: 'Accelerator application closes', source: 'personal_task', post_id: 'x' },
  { date: at(18), kind: 'event', title: 'Founders Breakfast', source: 'saved_post', post_id: 'y' },
  { date: at(20), kind: 'event', title: 'Zahnarzt', source: 'device' },
];

const LONG_GERMAN: CalendarItem[] = [
  {
    date: at(10),
    kind: 'deadline',
    title: 'Aufenthaltserlaubnisverlängerungsantragsabgabefrist bei der Ausländerbehörde',
    source: 'personal_task',
    post_id: 'x',
  },
  {
    date: at(19),
    kind: 'event',
    title: 'Existenzgründungszentrumseröffnungsveranstaltung mit Netzwerkmöglichkeiten',
    source: 'saved_post',
    post_id: 'y',
  },
];

const OTHER_DAY: CalendarItem[] = [
  { date: at(18, 6), kind: 'event', title: 'Next week only', source: 'saved_post', post_id: 'y' },
];

type Demo = 'normal' | 'long' | 'empty_month' | 'loading' | 'empty_day' | 'sheet';

const STATES: { key: Demo; label: string }[] = [
  { key: 'normal', label: 'Normal — event + deadline + device' },
  { key: 'long', label: 'Long German titles' },
  { key: 'empty_month', label: 'Empty month (nothing saved)' },
  { key: 'loading', label: 'Loading' },
  { key: 'empty_day', label: 'Selected day empty, month marked' },
  { key: 'sheet', label: 'Plan-when sheet' },
];

export default function OdysseyCalendarGallery() {
  const [demo, setDemo] = useState<Demo>('normal');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [lastAction, setLastAction] = useState('');

  const preview: OdysseyCalendarPreview = useMemo(() => {
    switch (demo) {
      case 'long':
        return { items: LONG_GERMAN };
      case 'empty_month':
        return { items: [] };
      case 'loading':
        return { items: [], loading: true };
      case 'empty_day':
        return { items: OTHER_DAY };
      default:
        return { items: TODAY_ITEMS };
    }
  }, [demo]);

  return (
    <Screen>
      <PageHeader title="Odyssey calendar" />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {STATES.map((state) => (
            <Pressable
              key={state.key}
              onPress={() => {
                setDemo(state.key);
                if (state.key === 'sheet') {
                  setSheetOpen(true);
                }
              }}
              style={{
                borderRadius: 14,
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: demo === state.key ? colors.brandCoral : '#FFFFFF',
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: demo === state.key ? '#FFFFFF' : '#475569',
                }}
              >
                {state.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {demo !== 'sheet' ? <OdysseyCalendarSection preview={preview} /> : null}

        {lastAction ? (
          <Text style={{ fontSize: 12, color: '#64748B' }}>{lastAction}</Text>
        ) : null}
      </ScrollView>

      <PlanWhenSheet
        visible={demo === 'sheet' && sheetOpen}
        onConfirm={(when) => {
          setSheetOpen(false);
          setLastAction(`confirmed: ${when.toString()}`);
        }}
        onSkip={() => {
          setSheetOpen(false);
          setLastAction('skipped (task saved undated)');
        }}
      />
    </Screen>
  );
}
