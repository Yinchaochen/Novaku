import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import { buildEventTime, EMPTY_EVENT_TIME, EventTimeValue, formatEventTime } from '../../lib/eventTime';
import { CalendarMonth } from './CalendarMonth';
import { TimeWheel, timeFrom24h, wheelTo24h } from './TimeWheel';

const CORAL = '#F47C7C';

export interface EventDateTimeFieldProps {
  value: EventTimeValue;
  onChange: (next: EventTimeValue) => void;
}

type Step = 'date' | 'start_time' | 'end_time';

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

/**
 * Optional event date/time on the Plaza composer (D-104). Empty by default —
 * an ordinary post carries no date. Once set, the value flows into
 * event_starts_at / event_ends_at and the Odyssey calendar shows it after the
 * reader saves or adds the post. Time is optional: leave the switch off for an
 * all-day event.
 */
export function EventDateTimeField({ value, onChange }: EventDateTimeFieldProps) {
  const { t, langCode } = useLanguage();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('date');
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(null);
  const [includeTime, setIncludeTime] = useState(false);
  const [startTime, setStartTime] = useState({ hour12: 6, minute: 0, ampm: 'PM' as 'AM' | 'PM' });
  const [endTime, setEndTime] = useState({ hour12: 8, minute: 0, ampm: 'PM' as 'AM' | 'PM' });
  const [viewMonth, setViewMonth] = useState(() => new Date());

  const label = value.start ? formatEventTime(value.start, value.end, langCode) : null;

  const openSheet = () => {
    const start = value.start ? new Date(value.start) : null;
    const end = value.end ? new Date(value.end) : null;
    const timed = start ? !(start.getHours() === 0 && start.getMinutes() === 0) : false;
    setDraftStart(start ? startOfDay(start) : null);
    setDraftEnd(end && start && startOfDay(end).getTime() !== startOfDay(start).getTime() ? startOfDay(end) : null);
    setIncludeTime(timed);
    if (start) setStartTime(timeFrom24h(start.getHours(), start.getMinutes()));
    if (end && timed) setEndTime(timeFrom24h(end.getHours(), end.getMinutes()));
    setViewMonth(start ?? new Date());
    setStep('date');
    setOpen(true);
  };

  const pickDay = (d: Date) => {
    const day = startOfDay(d);
    if (!draftStart || draftEnd) {
      setDraftStart(day);
      setDraftEnd(null);
      return;
    }
    if (day.getTime() < draftStart.getTime()) {
      setDraftStart(day);
      return;
    }
    if (day.getTime() === draftStart.getTime()) {
      return;
    }
    setDraftEnd(day);
  };

  const commit = () => {
    if (!draftStart) return;
    const s = includeTime ? wheelTo24h(startTime.hour12, startTime.minute, startTime.ampm) : null;
    const e = includeTime ? wheelTo24h(endTime.hour12, endTime.minute, endTime.ampm) : null;
    onChange(
      buildEventTime({
        startDay: draftStart,
        endDay: draftEnd,
        time: s && e ? { startH: s.hour, startM: s.minute, endH: e.hour, endM: e.minute } : null,
      }),
    );
    setOpen(false);
  };

  const clear = () => {
    onChange(EMPTY_EVENT_TIME);
    setOpen(false);
  };

  const tabs: Step[] = includeTime ? ['date', 'start_time', 'end_time'] : ['date'];

  return (
    <>
      {label ? (
        <View
          className="flex-row items-center rounded-2xl bg-white px-4"
          style={{ minHeight: 50, borderWidth: 1, borderColor: '#E5E7EB' }}
        >
          <Ionicons name="calendar-outline" size={18} color={CORAL} />
          <Text className="ml-3 flex-1 text-[15px]" style={{ color: '#111111' }} numberOfLines={2}>
            {label}
          </Text>
          <Pressable onPress={openSheet} hitSlop={8} accessibilityRole="button" testID="event-time.edit">
            <Text style={{ color: CORAL, fontWeight: '600', fontSize: 13 }}>{t.common.edit}</Text>
          </Pressable>
          <Pressable
            onPress={() => onChange(EMPTY_EVENT_TIME)}
            hitSlop={8}
            accessibilityRole="button"
            testID="event-time.remove"
            style={{ marginLeft: 12 }}
          >
            <Ionicons name="close-circle" size={20} color="#C4C7CE" />
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={openSheet}
          accessibilityRole="button"
          testID="event-time.add"
          className="flex-row items-center rounded-2xl px-4"
          style={{ height: 50, borderWidth: 1, borderColor: '#E5D6C8', backgroundColor: '#FFFBF6' }}
        >
          <Ionicons name="calendar-outline" size={18} color={CORAL} />
          <Text className="ml-3 flex-1 text-[15px]" style={{ color: '#9A6411' }}>
            {t.plaza.event_add}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#C4A77D" />
        </Pressable>
      )}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityLabel={t.common.cancel}
            style={StyleSheet.absoluteFillObject}
            onPress={() => setOpen(false)}
          />
          <View className="rounded-t-3xl bg-[#F4F5F8] px-5 pb-8 pt-4">
            <View className="mb-3 self-center h-1 w-10 rounded-full bg-neutral-300" />
            <Text className="mb-3 text-center text-[16px] font-bold" style={{ color: '#111827' }}>
              {t.plaza.event_title}
            </Text>

            {includeTime ? (
              <View
                className="mb-3 flex-row rounded-full bg-white p-1"
                style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
              >
                {tabs.map((s) => {
                  const isActive = step === s;
                  const labelText =
                    s === 'date' ? t.buddy.field_when : s === 'start_time' ? t.datetime.start : t.datetime.end;
                  return (
                    <Pressable
                      key={s}
                      onPress={() => setStep(s)}
                      className="flex-1 items-center py-2"
                      style={{ borderRadius: 999, backgroundColor: isActive ? CORAL : 'transparent' }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600', color: isActive ? '#FFF' : '#6B7280' }}>
                        {labelText}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {step === 'date' ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <CalendarMonth
                  month={viewMonth}
                  onMonthChange={setViewMonth}
                  selected={draftEnd ? null : draftStart}
                  rangeStart={draftEnd ? draftStart : null}
                  rangeEnd={draftEnd}
                  onSelect={pickDay}
                  minDate={startOfDay(new Date())}
                />
                <View
                  className="mt-3 flex-row items-center justify-between rounded-2xl bg-white px-4 py-3"
                  style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
                >
                  <Text style={{ fontSize: 14, color: '#374151', fontWeight: '600' }}>
                    {t.plaza.event_include_time}
                  </Text>
                  <Switch
                    value={includeTime}
                    onValueChange={(next) => {
                      setIncludeTime(next);
                      if (!next) setStep('date');
                    }}
                    trackColor={{ true: CORAL, false: '#D1D5DB' }}
                    testID="event-time.include-toggle"
                  />
                </View>
              </ScrollView>
            ) : step === 'start_time' ? (
              <TimeWheel {...startTime} onChange={setStartTime} />
            ) : (
              <TimeWheel {...endTime} onChange={setEndTime} />
            )}

            <View className="mt-3 flex-row gap-2">
              <Pressable
                onPress={clear}
                className="items-center rounded-2xl bg-white px-5 py-3"
                style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
                accessibilityRole="button"
                testID="event-time.clear"
              >
                <Text style={{ color: '#6B7280', fontWeight: '600' }}>{t.common.clear}</Text>
              </Pressable>
              <Pressable
                onPress={commit}
                disabled={!draftStart}
                className="flex-1 items-center rounded-2xl py-3"
                style={{ backgroundColor: draftStart ? CORAL : '#F0C9C9' }}
                accessibilityRole="button"
                testID="event-time.confirm"
              >
                <Text style={{ color: '#FFF', fontWeight: '700' }}>{t.common.confirm}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
});
