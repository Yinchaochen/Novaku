import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import { CalendarMonth } from './CalendarMonth';

export interface DatePickerProps {
  testID?: string;
  value: Date | null;
  onChange: (next: Date | null) => void;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  initialViewDate?: Date;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Box height to align with surrounding inputs (defaults to 50). */
  height?: number;
}

export function DatePicker({
  testID,
  value,
  onChange,
  placeholder,
  minDate,
  maxDate,
  initialViewDate,
  open,
  onOpenChange,
  height = 50,
}: DatePickerProps) {
  const { t, langCode } = useLanguage();
  const [internalOpen, setInternalOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => value ?? initialViewDate ?? new Date());
  const visible = open ?? internalOpen;

  const setVisible = (next: boolean) => {
    if (open === undefined) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  };

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
        testID={testID}
        onPress={() => {
          setViewMonth(value ?? initialViewDate ?? new Date());
          setVisible(true);
        }}
        className="flex-row items-center rounded-2xl bg-white px-4"
        style={{ height, borderWidth: 1, borderColor: '#E5E7EB' }}
        accessibilityRole="button"
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
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable
          onPress={() => setVisible(false)}
          className="flex-1 items-center justify-center bg-black/40 px-6"
        >
          <Pressable onPress={(e) => e.stopPropagation()} className="w-full max-w-[360px]">
            <CalendarMonth
              month={viewMonth}
              onMonthChange={setViewMonth}
              selected={value}
              onSelect={(date) => {
                onChange(date);
                setVisible(false);
              }}
              minDate={minDate}
              maxDate={maxDate}
            />
            <View className="mt-3 flex-row gap-2">
              <Pressable
                onPress={() => setVisible(false)}
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
