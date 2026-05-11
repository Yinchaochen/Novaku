import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import { CalendarMonth } from './CalendarMonth';
import { TimeWheel, timeFrom24h, wheelTo24h } from './TimeWheel';

export interface DateTimeRangePickerProps {
  value: { start: Date | null; end: Date | null };
  onChange: (next: { start: Date | null; end: Date | null }) => void;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
}

function combineDateTime(date: Date, hour: number, minute: number): Date {
  const r = new Date(date);
  r.setHours(hour, minute, 0, 0);
  return r;
}

function formatDateTimeRange(
  start: Date | null,
  end: Date | null,
  langCode: string,
): string | null {
  if (!start || !end) return null;
  try {
    const dateFmt = new Intl.DateTimeFormat(langCode, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const timeFmt = new Intl.DateTimeFormat(langCode, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `${dateFmt.format(start)} ${timeFmt.format(start)} – ${timeFmt.format(end)}`;
  } catch {
    return `${start.toLocaleDateString()} ${start.toLocaleTimeString()} – ${end.toLocaleTimeString()}`;
  }
}

type Step = 'date' | 'start_time' | 'end_time';

export function DateTimeRangePicker({
  value,
  onChange,
  placeholder,
  minDate,
  maxDate,
}: DateTimeRangePickerProps) {
  const { t, langCode } = useLanguage();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('date');
  const [draftDate, setDraftDate] = useState<Date | null>(value.start);
  const [viewMonth, setViewMonth] = useState(() => value.start ?? new Date());

  const initialStartTime = value.start
    ? timeFrom24h(value.start.getHours(), value.start.getMinutes())
    : { hour12: 9, minute: 0, ampm: 'AM' as const };
  const initialEndTime = value.end
    ? timeFrom24h(value.end.getHours(), value.end.getMinutes())
    : { hour12: 11, minute: 0, ampm: 'AM' as const };

  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime);

  const label = useMemo(
    () => formatDateTimeRange(value.start, value.end, langCode),
    [value, langCode],
  );

  const openSheet = () => {
    setDraftDate(value.start ?? null);
    setStep('date');
    setStartTime(initialStartTime);
    setEndTime(initialEndTime);
    setOpen(true);
  };

  const commit = () => {
    if (!draftDate) return;
    const s = wheelTo24h(startTime.hour12, startTime.minute, startTime.ampm);
    const e = wheelTo24h(endTime.hour12, endTime.minute, endTime.ampm);
    const start = combineDateTime(draftDate, s.hour, s.minute);
    const end = combineDateTime(draftDate, e.hour, e.minute);
    if (end <= start) return;
    onChange({ start, end });
    setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={openSheet}
        className="flex-row items-center rounded-2xl bg-white px-4"
        style={{ height: 50, borderWidth: 1, borderColor: '#E5E7EB' }}
      >
        <Ionicons name="time-outline" size={18} color="#9CA3AF" />
        <Text
          className="ml-3 flex-1 text-[15px]"
          style={{ color: label ? '#111111' : '#9CA3AF' }}
          numberOfLines={1}
        >
          {label ?? placeholder ?? ''}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalRoot}>
          {/* Backdrop sits behind the sheet so scroll gestures inside the
              sheet never get swallowed by a Pressable ancestor. */}
          <Pressable
            accessibilityLabel="Close picker"
            style={StyleSheet.absoluteFillObject}
            onPress={() => setOpen(false)}
          />
          <View
            className="rounded-t-3xl bg-[#F4F5F8] px-5 pb-8 pt-4"
          >
            <View className="mb-3 self-center h-1 w-10 rounded-full bg-neutral-300" />

            {/* Steps tab */}
            <View className="mb-3 flex-row rounded-full bg-white p-1" style={{ borderWidth: 1, borderColor: '#E5E7EB' }}>
              {(['date', 'start_time', 'end_time'] as Step[]).map((s) => {
                const isActive = step === s;
                const labelText =
                  s === 'date'
                    ? t.buddy.field_when
                    : s === 'start_time'
                      ? t.datetime.start
                      : t.datetime.end;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setStep(s)}
                    className="flex-1 items-center py-2"
                    style={{ borderRadius: 999, backgroundColor: isActive ? '#F47C7C' : 'transparent' }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: isActive ? '#FFF' : '#6B7280' }}>
                      {labelText}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Calendar can be tall enough to need scrolling on small phones,
                but the time wheels are short AND each contains its own
                ScrollView — wrapping them in another vertical ScrollView
                lets the outer one swallow the wheel gestures, so only the
                calendar step gets the outer ScrollView. */}
            {step === 'date' ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <CalendarMonth
                  month={viewMonth}
                  onMonthChange={setViewMonth}
                  selected={draftDate}
                  onSelect={(d) => setDraftDate(d)}
                  minDate={minDate}
                  maxDate={maxDate}
                />
              </ScrollView>
            ) : step === 'start_time' ? (
              <TimeWheel
                hour12={startTime.hour12}
                minute={startTime.minute}
                ampm={startTime.ampm}
                onChange={setStartTime}
              />
            ) : (
              <TimeWheel
                hour12={endTime.hour12}
                minute={endTime.minute}
                ampm={endTime.ampm}
                onChange={setEndTime}
              />
            )}

            <View className="mt-3 flex-row gap-2">
              <Pressable
                onPress={() => setOpen(false)}
                className="flex-1 items-center justify-center rounded-full bg-white py-3"
              >
                <Text className="text-[14px] font-semibold text-neutral-600">{t.common.cancel}</Text>
              </Pressable>
              <Pressable
                onPress={commit}
                disabled={!draftDate}
                className="flex-1 items-center justify-center rounded-full py-3"
                style={{ backgroundColor: draftDate ? '#F47C7C' : '#CBD5E1' }}
              >
                <Text className="text-[14px] font-semibold text-white">{t.common.save}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
});
