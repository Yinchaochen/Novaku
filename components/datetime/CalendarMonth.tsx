import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import { YearMonthPickerModal } from './YearMonthPickerModal';

const CORAL = '#F47C7C';
const CORAL_LIGHT = '#FFE6EA';

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isBefore(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() < startOfDay(b).getTime();
}

function isBetween(d: Date, lo: Date, hi: Date): boolean {
  const t = startOfDay(d).getTime();
  return t > startOfDay(lo).getTime() && t < startOfDay(hi).getTime();
}

export interface CalendarMonthProps {
  month: Date;
  onMonthChange: (next: Date) => void;
  selected?: Date | null;
  rangeStart?: Date | null;
  rangeEnd?: Date | null;
  onSelect: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
}

export function CalendarMonth({
  month,
  onMonthChange,
  selected = null,
  rangeStart = null,
  rangeEnd = null,
  onSelect,
  minDate,
  maxDate,
}: CalendarMonthProps) {
  const { t, langCode } = useLanguage();
  const [pickerOpen, setPickerOpen] = useState(false);

  const grid = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const startOffset = first.getDay(); // Sun = 0
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i += 1) cells.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) {
      cells.push(new Date(month.getFullYear(), month.getMonth(), d));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [month]);

  const monthLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(langCode, { month: 'long', year: 'numeric' }).format(month);
    } catch {
      return month.toDateString().split(' ').slice(1, 3).join(' ');
    }
  }, [month, langCode]);

  const weekdayHeaders = [
    t.datetime.weekday_sun,
    t.datetime.weekday_mon,
    t.datetime.weekday_tue,
    t.datetime.weekday_wed,
    t.datetime.weekday_thu,
    t.datetime.weekday_fri,
    t.datetime.weekday_sat,
  ];

  return (
    <View className="rounded-2xl bg-white px-3 py-3" style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 }}>
      <View className="mb-2 items-center px-1 py-1">
        <Pressable
          onPress={() => setPickerOpen(true)}
          hitSlop={8}
          className="px-3 py-1.5"
        >
          <Text className="text-[15px] font-semibold text-neutral-800">{monthLabel}</Text>
        </Pressable>
      </View>

      <YearMonthPickerModal
        visible={pickerOpen}
        month={month}
        minDate={minDate}
        maxDate={maxDate}
        onCancel={() => setPickerOpen(false)}
        onConfirm={(next) => {
          setPickerOpen(false);
          onMonthChange(next);
        }}
      />

      <View className="mb-1.5 flex-row">
        {weekdayHeaders.map((label, i) => (
          <View key={i} className="flex-1 items-center py-1">
            <Text
              className="text-[11px] font-semibold"
              style={{ color: i === 0 || i === 6 ? CORAL : '#94A3B8' }}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap">
        {grid.map((d, idx) => {
          if (!d) return <View key={`spacer-${idx}`} style={{ width: `${100 / 7}%`, height: 38 }} />;
          const disabled =
            (minDate && isBefore(d, minDate)) || (maxDate && isBefore(maxDate, d));
          const isSelected =
            (selected && isSameDay(d, selected)) ||
            (rangeStart && isSameDay(d, rangeStart)) ||
            (rangeEnd && isSameDay(d, rangeEnd));
          const isInRange = rangeStart && rangeEnd && isBetween(d, rangeStart, rangeEnd);

          return (
            <Pressable
              key={d.toISOString()}
              onPress={() => !disabled && onSelect(d)}
              disabled={!!disabled}
              style={{ width: `${100 / 7}%`, height: 38 }}
              className="items-center justify-center"
            >
              <View
                style={[
                  styles.dayBubble,
                  isSelected ? styles.selectedDayBubble : null,
                  isInRange && !isSelected ? styles.rangeDayBubble : null,
                ]}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: isSelected ? '700' : '500',
                    color: disabled
                      ? '#CBD5E1'
                      : isSelected
                        ? '#FFFFFF'
                        : isInRange
                          ? '#9F4344'
                          : '#1F2937',
                  }}
                >
                  {d.getDate()}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dayBubble: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  selectedDayBubble: {
    borderRadius: 999,
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,
    borderBottomLeftRadius: 999,
    overflow: 'hidden',
    backgroundColor: CORAL,
  },
  rangeDayBubble: {
    borderRadius: 16,
    backgroundColor: CORAL_LIGHT,
  },
});
