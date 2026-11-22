import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import { type OpeningHours, type Weekday, WEEKDAYS } from '../../features/merchants/types';
import { hhmm, minutesOf } from '../../lib/merchantFormat';

const HALF_HOURS = Array.from({ length: 49 }, (_, index) => hhmm(index * 30));
const DEFAULT_RANGE = { open: '09:00', close: '18:00' };
// The setup modal's own accent (tailwind `primary`), so the editor matches the steps around it.
const PRIMARY = '#FF9F6E';

type Editing = { day: Weekday; edge: 'open' | 'close' } | null;

// One range per day here; the API takes two, so a split day set elsewhere is kept as its first range.
export function OpeningHoursEditor({
  value,
  onChange,
}: {
  value: OpeningHours;
  onChange: (next: OpeningHours) => void;
}) {
  const { t } = useLanguage();
  const [editing, setEditing] = useState<Editing>(null);
  const strip = useRef<ScrollView>(null);
  const dayLabels = useMemo(
    () => ({
      mon: t.merchant.day_mon,
      tue: t.merchant.day_tue,
      wed: t.merchant.day_wed,
      thu: t.merchant.day_thu,
      fri: t.merchant.day_fri,
      sat: t.merchant.day_sat,
      sun: t.merchant.day_sun,
    }),
    [t],
  );

  const setDay = (day: Weekday, ranges: OpeningHours[Weekday]) => onChange({ ...value, [day]: ranges });

  useEffect(() => {
    if (!editing) return;
    const current = value[editing.day]?.[0]?.[editing.edge];
    const index = current ? HALF_HOURS.indexOf(current) : 0;
    const timer = setTimeout(() => strip.current?.scrollTo({ x: Math.max(0, index * 62 - 120), animated: false }), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  return (
    <View style={{ gap: 6 }}>
      {WEEKDAYS.map((day) => {
        const range = value[day]?.[0] ?? null;
        const open = range !== null;
        const editingThis = editing?.day === day ? editing : null;
        return (
          <View key={day} style={{ borderBottomWidth: 1, borderBottomColor: '#F1E9E3', paddingVertical: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 8 }}>
              <Text style={{ width: 44, fontSize: 15, color: '#111827' }}>{dayLabels[day]}</Text>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {open ? (
                  <>
                    {(['open', 'close'] as const).map((edge, index) => (
                      <View key={edge} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {index === 1 ? <Text style={{ color: '#6B7280' }}>–</Text> : null}
                        <Pressable
                          testID={`shop.hours.${day}.${edge}`}
                          accessibilityRole="button"
                          accessibilityLabel={`${dayLabels[day]} ${edge === 'open' ? t.merchant.hours_opens : t.merchant.hours_closes} ${range[edge]}`}
                          onPress={() => setEditing(editingThis?.edge === edge ? null : { day, edge })}
                          style={{
                            minHeight: 36,
                            paddingHorizontal: 10,
                            borderRadius: 999,
                            justifyContent: 'center',
                            backgroundColor: editingThis?.edge === edge ? '#FFE3D6' : '#F3ECE6',
                          }}
                        >
                          <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>{range[edge]}</Text>
                        </Pressable>
                      </View>
                    ))}
                  </>
                ) : (
                  <Text style={{ fontSize: 15, color: '#6B7280' }}>{t.merchant.hours_closed}</Text>
                )}
              </View>
              <Switch
                testID={`shop.hours.${day}.toggle`}
                accessibilityLabel={`${dayLabels[day]} ${open ? t.merchant.hours_open : t.merchant.hours_closed}`}
                value={open}
                onValueChange={(next) => {
                  setEditing(null);
                  setDay(day, next ? [{ ...DEFAULT_RANGE }] : []);
                }}
                trackColor={{ true: PRIMARY, false: '#D1D5DB' }}
                thumbColor="#FFFFFF"
                // React Native Web paints the on-state knob teal unless told otherwise.
                {...({ activeThumbColor: '#FFFFFF' } as object)}
              />
            </View>
            {editingThis && range ? (
              <ScrollView ref={strip} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 6 }}>
                {HALF_HOURS.filter((time) => (editingThis.edge === 'open' ? time !== '24:00' : time !== '00:00')).map((time) => {
                  const active = range[editingThis.edge] === time;
                  return (
                    <Pressable
                      key={time}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => {
                        const nextRange = { ...range, [editingThis.edge]: time };
                        if (minutesOf(nextRange.open) === minutesOf(nextRange.close)) return;
                        setDay(day, [nextRange]);
                        setEditing(null);
                      }}
                      style={{
                        minHeight: 36,
                        paddingHorizontal: 10,
                        borderRadius: 999,
                        justifyContent: 'center',
                        backgroundColor: active ? PRIMARY : '#F3ECE6',
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '700', color: active ? '#FFFFFF' : '#374151' }}>{time}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
