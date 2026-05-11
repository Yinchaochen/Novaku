import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import { ScrollWheel } from './ScrollWheel';

/**
 * Small modal that floats in the screen center and lets the user pick a
 * year + month via two scroll wheels. Replaces the prev/next arrow buttons
 * that used to sit beside the month label in CalendarMonth.
 */
export interface YearMonthPickerModalProps {
  visible: boolean;
  /** Currently displayed month — the wheel pre-selects this. */
  month: Date;
  /** Range bounds. Defaults to current year ±10 if both omitted. */
  minDate?: Date;
  maxDate?: Date;
  onCancel: () => void;
  onConfirm: (next: Date) => void;
}

export function YearMonthPickerModal({
  visible,
  month,
  minDate,
  maxDate,
  onCancel,
  onConfirm,
}: YearMonthPickerModalProps) {
  const { t, langCode } = useLanguage();

  const { yearItems, monthItems } = useMemo(() => {
    const now = new Date();
    const minYear = minDate ? minDate.getFullYear() : now.getFullYear() - 10;
    const maxYear = maxDate ? maxDate.getFullYear() : now.getFullYear() + 10;
    const years: number[] = [];
    for (let y = minYear; y <= maxYear; y += 1) years.push(y);

    let monthFmt: Intl.DateTimeFormat;
    try {
      monthFmt = new Intl.DateTimeFormat(langCode, { month: 'short' });
    } catch {
      monthFmt = new Intl.DateTimeFormat('en', { month: 'short' });
    }
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(2000, i, 1);
      return { value: i, label: monthFmt.format(d) };
    });
    return { yearItems: years, monthItems: months };
  }, [minDate, maxDate, langCode]);

  const [draftYear, setDraftYear] = useState<number>(month.getFullYear());
  const [draftMonth, setDraftMonth] = useState<number>(month.getMonth());

  // Re-seed drafts whenever the modal opens fresh.
  useEffect(() => {
    if (visible) {
      setDraftYear(month.getFullYear());
      setDraftMonth(month.getMonth());
    }
  }, [visible, month]);

  const monthLabels = useMemo(
    () => monthItems.map((m) => m.label) as readonly string[],
    [monthItems],
  );
  const labelToIndex = useMemo(() => {
    const map = new Map<string, number>();
    monthItems.forEach((m) => map.set(m.label, m.value));
    return map;
  }, [monthItems]);

  const selectedLabel = monthItems[draftMonth]?.label ?? monthItems[0].label;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalRoot}>
        {/* Backdrop sits BEHIND content. Taps on it close, but it does not
            wrap the panel, so scroll gestures inside the panel are never
            swallowed by a Pressable ancestor. */}
        <Pressable
          accessibilityLabel="Close picker"
          style={StyleSheet.absoluteFillObject}
          onPress={onCancel}
        />
        <View
          style={{
            width: 280,
            backgroundColor: '#FFFFFF',
            borderRadius: 24,
            paddingHorizontal: 18,
            paddingTop: 18,
            paddingBottom: 14,
            shadowColor: '#000',
            shadowOpacity: 0.12,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
            elevation: 10,
          }}
        >
          <View className="mb-2 flex-row">
            <View className="flex-1 items-center">
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#94A3B8' }}>
                {t.datetime.year}
              </Text>
            </View>
            <View className="flex-1 items-center">
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#94A3B8' }}>
                {t.datetime.month}
              </Text>
            </View>
          </View>

          <View className="flex-row">
            <View className="flex-1">
              <ScrollWheel
                items={yearItems}
                value={draftYear}
                onChange={setDraftYear}
              />
            </View>
            <View className="flex-1">
              <ScrollWheel
                items={monthLabels}
                value={selectedLabel}
                onChange={(label) => {
                  const idx = labelToIndex.get(label);
                  if (idx != null) setDraftMonth(idx);
                }}
              />
            </View>
          </View>

          <View className="mt-3 flex-row gap-2">
            <Pressable
              onPress={onCancel}
              className="flex-1 items-center justify-center rounded-full py-3"
              style={{ backgroundColor: '#F4F4F5' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280' }}>
                {t.common.cancel}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onConfirm(new Date(draftYear, draftMonth, 1))}
              className="flex-1 items-center justify-center rounded-full py-3"
              style={{ backgroundColor: '#F47C7C' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>
                {t.common.confirm}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
});
