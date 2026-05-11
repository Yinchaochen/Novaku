import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import { CalendarMonth } from './CalendarMonth';

export interface DateRangePickerProps {
  value: { start: Date | null; end: Date | null };
  onChange: (next: { start: Date | null; end: Date | null }) => void;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
}

function formatRange(start: Date | null, end: Date | null, langCode: string): string | null {
  if (!start && !end) return null;
  const fmt = (d: Date) => {
    try {
      return new Intl.DateTimeFormat(langCode, { month: 'short', day: 'numeric' }).format(d);
    } catch {
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }
  };
  if (start && !end) return `${fmt(start)} – …`;
  if (!start && end) return `… – ${fmt(end)}`;
  if (start && end && start.getTime() === end.getTime()) return fmt(start);
  return `${fmt(start!)} – ${fmt(end!)}`;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder,
  minDate,
  maxDate,
}: DateRangePickerProps) {
  const { langCode } = useLanguage();
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => value.start ?? new Date());

  const label = useMemo(() => formatRange(value.start, value.end, langCode), [value, langCode]);

  const handleSelect = (date: Date) => {
    if (!value.start || (value.start && value.end)) {
      // Start fresh: set start, clear end
      onChange({ start: date, end: null });
      return;
    }
    // start exists, end empty
    if (date < value.start) {
      // user picked earlier date than start → swap
      onChange({ start: date, end: value.start });
    } else {
      onChange({ start: value.start, end: date });
    }
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center rounded-2xl bg-white px-4"
        style={{
          height: 50,
          borderWidth: 1,
          borderColor: '#E5E7EB',
        }}
      >
        <Ionicons name="calendar-outline" size={18} color="#9CA3AF" />
        <Text
          className="ml-3 flex-1 text-[15px]"
          style={{ color: label ? '#111111' : '#9CA3AF' }}
          numberOfLines={1}
        >
          {label ?? placeholder ?? ''}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          onPress={() => setOpen(false)}
          className="flex-1 items-center justify-center bg-black/40 px-6"
        >
          <Pressable onPress={(e) => e.stopPropagation()} className="w-full max-w-[360px]">
            <CalendarMonth
              month={viewMonth}
              onMonthChange={setViewMonth}
              rangeStart={value.start}
              rangeEnd={value.end}
              onSelect={handleSelect}
              minDate={minDate}
              maxDate={maxDate}
            />
            <View className="mt-3 flex-row gap-2">
              <Pressable
                onPress={() => onChange({ start: null, end: null })}
                className="flex-1 items-center justify-center rounded-full bg-white py-3"
              >
                <Text className="text-[14px] font-semibold text-neutral-600">Reset</Text>
              </Pressable>
              <Pressable
                onPress={() => setOpen(false)}
                className="flex-1 items-center justify-center rounded-full bg-[#F47C7C] py-3"
              >
                <Text className="text-[14px] font-semibold text-white">Done</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
