import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import { tap } from '../../lib/haptics';
import { ScrollWheel } from './ScrollWheel';

const CORAL = '#F47C7C';
const CORAL_DARK = '#D86168';
const CORAL_SOFT = '#FFF0EC';

export interface YearPickerProps {
  value: number | null;
  onChange: (next: number) => void;
  placeholder?: string;
  minYear: number;
  maxYear: number;
  initialYear?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  height?: number;
  error?: boolean;
}

export function YearPicker({
  value,
  onChange,
  placeholder,
  minYear,
  maxYear,
  initialYear,
  open,
  onOpenChange,
  height = 58,
  error = false,
}: YearPickerProps) {
  const { t } = useLanguage();
  const [internalOpen, setInternalOpen] = useState(false);
  const fallbackYear = Math.max(minYear, Math.min(maxYear, initialYear ?? maxYear));
  const [draftYear, setDraftYear] = useState(value ?? fallbackYear);
  const visible = open ?? internalOpen;

  const years = useMemo(() => {
    const items: number[] = [];
    for (let year = minYear; year <= maxYear; year += 1) {
      items.push(year);
    }
    return items;
  }, [maxYear, minYear]);

  useEffect(() => {
    if (visible) {
      setDraftYear(value ?? fallbackYear);
    }
  }, [fallbackYear, value, visible]);

  const setVisible = (next: boolean) => {
    if (open === undefined) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  };

  return (
    <>
      <Pressable
        onPress={() => {
          tap('light');
          setVisible(true);
        }}
        style={({ pressed }) => [
          styles.trigger,
          {
            height,
            borderColor: error ? '#D94F57' : CORAL,
            backgroundColor: error ? '#FFF4F3' : '#FFFDF8',
            transform: [{ translateY: pressed ? 3 : 0 }],
            borderBottomWidth: pressed ? 2 : 5,
          },
        ]}
        accessibilityRole="button"
        accessibilityState={{ expanded: visible }}
      >
        <View style={[styles.triggerIcon, error ? styles.triggerIconError : null]}>
          <Ionicons name="calendar" size={19} color="#FFFFFF" />
        </View>
        <Text
          style={[
            styles.triggerText,
            { color: value === null ? '#795F53' : '#33231D' },
          ]}
          numberOfLines={1}
        >
          {value ?? placeholder ?? ''}
        </Text>
        <View style={styles.triggerAccessory}>
          <Ionicons name="chevron-down" size={18} color={error ? '#D94F57' : CORAL_DARK} />
        </View>
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityLabel={t.common.cancel}
            style={StyleSheet.absoluteFillObject}
            onPress={() => setVisible(false)}
          />
          <View style={styles.panel}>
            <View style={styles.panelAccent} />
            <Text style={styles.title}>{t.auth.birth_year_label}</Text>
            <View style={styles.wheelFrame}>
              <ScrollWheel
                items={years}
                value={draftYear}
                onChange={setDraftYear}
                itemHeight={44}
                visibleCount={5}
                fadeColor="#FFF9ED"
                highlightColor="#FFE1DA"
                highlightBorderColor="#F6A49A"
              />
            </View>
            <View style={styles.actions}>
              <Pressable
                onPress={() => {
                  tap('light');
                  setVisible(false);
                }}
                style={({ pressed }) => [
                  styles.cancelButton,
                  pressed ? styles.cancelButtonPressed : null,
                ]}
              >
                <Text style={styles.cancelText}>
                  {t.common.cancel}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  tap('medium');
                  onChange(draftYear);
                  setVisible(false);
                }}
                style={({ pressed }) => [
                  styles.confirmButton,
                  pressed ? styles.confirmButtonPressed : null,
                ]}
              >
                <Ionicons name="checkmark-circle" size={19} color="#FFFFFF" />
                <Text style={styles.confirmText}>
                  {t.common.confirm}
                </Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  panel: {
    width: '100%',
    maxWidth: 340,
    overflow: 'hidden',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#F7D7CF',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  panelAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 7,
    backgroundColor: CORAL,
  },
  title: {
    marginBottom: 14,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: '#33231D',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 2,
    paddingHorizontal: 12,
    shadowColor: CORAL_DARK,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  triggerIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: CORAL,
  },
  triggerIconError: {
    backgroundColor: '#D94F57',
  },
  triggerText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '700',
  },
  triggerAccessory: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: CORAL_SOFT,
  },
  wheelFrame: {
    overflow: 'hidden',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#F4D7CE',
    backgroundColor: '#FFF9ED',
    paddingHorizontal: 8,
  },
  actions: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 0.8,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E8DDD7',
    backgroundColor: '#FFFFFF',
  },
  cancelButtonPressed: {
    backgroundColor: '#F8F4F1',
    transform: [{ scale: 0.98 }],
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#795F53',
  },
  confirmButton: {
    flex: 1.2,
    minHeight: 51,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CORAL_DARK,
    borderBottomWidth: 5,
    backgroundColor: CORAL,
    shadowColor: CORAL_DARK,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  confirmButtonPressed: {
    borderBottomWidth: 2,
    transform: [{ translateY: 3 }],
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
