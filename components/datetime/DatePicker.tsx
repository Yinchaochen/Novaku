import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import { CalendarMonth } from './CalendarMonth';

export interface DatePickerProps {
  value: Date | null;
  onChange: (next: Date | null) => void;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  /** Box height to align with surrounding inputs (defaults to 50). */
  height?: number;
}

export function DatePicker({
  value,
  onChange,
  placeholder,
  minDate,
  maxDate,
  height = 50,
}: DatePickerProps) {
  const { t, langCode } = useLanguage();
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => value ?? new Date());

  const label = useMemo(() => {
    if (!value) return null;
    try {
      return new Intl.DateTimeFormat(langCode, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(value);
    } catch {
      return `${value.getFullYear()}-${value.getMonth() + 1}-${value.getDate()}`;
    }
  }, [value, langCode]);

  return (
    <>
      <Pressable
        onPress={() => {
          setViewMonth(value ?? new Date());
          setOpen(true);
        }}
        className="flex-row items-center rounded-2xl bg-white px-4"
        style={{ height, borderWidth: 1, borderColor: '#E5E7EB' }}
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
              selected={value}
              onSelect={(date) => {
                onChange(date);
                setOpen(false);
              }}
              minDate={minDate}
              maxDate={maxDate}
            />
            <View className="mt-3 flex-row gap-2">
              <Pressable
                onPress={() => setOpen(false)}
                className="flex-1 items-center justify-center rounded-full bg-white py-3"
              >
                <Text className="text-[14px] font-semibold text-neutral-600">
                  {t.common.cancel}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
