import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import { CalendarMonth } from '../datetime/CalendarMonth';
import { TimeWheel } from '../datetime/TimeWheel';

/**
 * "When do you plan to go?" — shown after tapping add-to-odyssey on a Plaza
 * post (D-083). Picking a moment puts it on the Odyssey calendar; skipping
 * saves the task undated, exactly as before. The sheet never blocks the save:
 * both buttons complete the add, they only differ in whether a date rides
 * along.
 */

export interface PlanWhenSheetProps {
  visible: boolean;
  onConfirm: (plannedAt: Date) => void;
  onSkip: () => void;
}

function combine(day: Date, hour12: number, minute: number, ampm: 'AM' | 'PM'): Date {
  const result = new Date(day);
  let hour = hour12 % 12;
  if (ampm === 'PM') {
    hour += 12;
  }
  result.setHours(hour, minute, 0, 0);
  return result;
}

export function PlanWhenSheet({ visible, onConfirm, onSkip }: PlanWhenSheetProps) {
  const { t } = useLanguage();
  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState<Date>(today);
  const [day, setDay] = useState<Date | null>(null);
  const [time, setTime] = useState<{ hour12: number; minute: number; ampm: 'AM' | 'PM' }>({
    hour12: 6,
    minute: 0,
    ampm: 'PM',
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onSkip}>
      <View style={styles.scrim}>
        <View style={styles.card}>
          <Text style={styles.title}>{t.odyssey_calendar.plan_title}</Text>
          <Text style={styles.subtitle}>{t.odyssey_calendar.plan_subtitle}</Text>

          <CalendarMonth
            month={month}
            onMonthChange={setMonth}
            selected={day}
            onSelect={setDay}
            minDate={today}
          />

          {day ? (
            <View style={styles.timeRow}>
              <TimeWheel
                hour12={time.hour12}
                minute={time.minute}
                ampm={time.ampm}
                onChange={setTime}
              />
            </View>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              onPress={onSkip}
              accessibilityRole="button"
              style={styles.skipButton}
              testID="plan-when.skip"
            >
              <Text style={styles.skipLabel}>{t.odyssey_calendar.plan_skip}</Text>
            </Pressable>
            <Pressable
              onPress={() => day && onConfirm(combine(day, time.hour12, time.minute, time.ampm))}
              disabled={!day}
              accessibilityRole="button"
              style={[styles.confirmButton, !day ? styles.confirmDisabled : null]}
              testID="plan-when.confirm"
            >
              <Text style={styles.confirmLabel}>{t.odyssey_calendar.plan_confirm}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    padding: 18,
    gap: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  timeRow: {
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  skipButton: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  confirmButton: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#F47C7C',
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmDisabled: {
    opacity: 0.4,
  },
  confirmLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
