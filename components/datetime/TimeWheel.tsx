import { Text, View } from 'react-native';

import { ScrollWheel } from './ScrollWheel';

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1) as readonly number[]; // 1..12
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5) as readonly number[]; // 0,5,10,...55
const AMPM = ['AM', 'PM'] as const;

export interface TimeWheelProps {
  hour12: number;        // 1..12
  minute: number;        // 0..59 (rounded to 5)
  ampm: 'AM' | 'PM';
  onChange: (next: { hour12: number; minute: number; ampm: 'AM' | 'PM' }) => void;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export function TimeWheel({ hour12, minute, ampm, onChange }: TimeWheelProps) {
  return (
    <View className="rounded-2xl bg-white px-3 py-3" style={{ borderWidth: 1, borderColor: '#E5E7EB' }}>
      <View className="flex-row items-center">
        <View className="flex-1">
          <ScrollWheel
            items={HOURS_12}
            value={hour12}
            onChange={(v) => onChange({ hour12: v, minute, ampm })}
            formatter={(v) => pad(v)}
          />
        </View>
        <View style={{ width: 12, alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#94A3B8' }}>:</Text>
        </View>
        <View className="flex-1">
          <ScrollWheel
            items={MINUTES}
            value={minute}
            onChange={(v) => onChange({ hour12, minute: v, ampm })}
            formatter={(v) => pad(v)}
          />
        </View>
        <View style={{ width: 10 }} />
        <View className="flex-1">
          <ScrollWheel
            items={AMPM}
            value={ampm}
            onChange={(v) => onChange({ hour12, minute, ampm: v })}
          />
        </View>
      </View>
    </View>
  );
}

/** Convert wheel state → 24-hour { hour, minute }. */
export function wheelTo24h(hour12: number, minute: number, ampm: 'AM' | 'PM'): {
  hour: number;
  minute: number;
} {
  let hour = hour12 % 12;
  if (ampm === 'PM') hour += 12;
  return { hour, minute };
}

/** Convert 24-hour { hour, minute } → wheel state. */
export function timeFrom24h(hour: number, minute: number): {
  hour12: number;
  minute: number;
  ampm: 'AM' | 'PM';
} {
  const ampm: 'AM' | 'PM' = hour >= 12 ? 'PM' : 'AM';
  let h12 = hour % 12;
  if (h12 === 0) h12 = 12;
  return { hour12: h12, minute, ampm };
}
