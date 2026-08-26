import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import {
  CalendarItem,
  fetchCalendarItems,
  mergeDeviceEvents,
  monthRange,
} from './calendarItems';

/**
 * Server items for one month, with the phone calendar merged in when the
 * user has connected it (D-083).
 *
 * The device side is opt-in and local: the OS permission dialog is the
 * consent, an AsyncStorage flag remembers the choice (a boolean, not
 * sensitive), and device events are merged in memory only — never uploaded.
 * On web there is no device calendar; the toggle hides itself.
 */

const DEVICE_CALENDAR_KEY = 'postervia.odyssey_calendar.device_enabled.v1';

export function useOdysseyCalendar(month: Date) {
  const monthKey = `${month.getFullYear()}-${month.getMonth() + 1}`;
  return useQuery({
    queryKey: ['odyssey', 'calendar', monthKey],
    queryFn: () => fetchCalendarItems(month),
    staleTime: 60_000,
  });
}

async function readDeviceEvents(month: Date): Promise<CalendarItem[]> {
  // Dynamic import keeps expo-calendar out of the web bundle entirely.
  const ExpoCalendar = await import('expo-calendar');
  const { start, end } = monthRange(month);
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  const calendars = await ExpoCalendar.getCalendarsAsync(ExpoCalendar.EntityTypes.EVENT);
  if (!calendars.length) {
    return [];
  }
  const events = await ExpoCalendar.getEventsAsync(
    calendars.map((c) => c.id),
    startDate,
    endDate,
  );
  return events
    .map((e) => ({
      date: new Date(e.startDate).toISOString(),
      kind: 'event' as const,
      title: e.title || '',
      source: 'device' as const,
    }))
    .filter((e) => e.title.length > 0);
}

export function useDeviceCalendar(month: Date) {
  const [enabled, setEnabled] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [events, setEvents] = useState<CalendarItem[]>([]);
  const supported = Platform.OS !== 'web';

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(DEVICE_CALENDAR_KEY)
      .then((value) => {
        if (alive) {
          setEnabled(value === '1');
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) {
          setHydrated(true);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!supported || !hydrated || !enabled) {
      setEvents([]);
      return;
    }
    let alive = true;
    readDeviceEvents(month)
      .then((items) => {
        if (alive) {
          setEvents(items);
        }
      })
      .catch(() => {
        // Permission revoked in OS settings, or the module is unavailable in
        // this build. Show nothing rather than an error: the server half of
        // the calendar is unaffected.
        if (alive) {
          setEvents([]);
        }
      });
    return () => {
      alive = false;
    };
  }, [supported, hydrated, enabled, month]);

  const connect = useCallback(async (): Promise<boolean> => {
    if (!supported) {
      return false;
    }
    try {
      const ExpoCalendar = await import('expo-calendar');
      const { status } = await ExpoCalendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        return false;
      }
      setEnabled(true);
      await AsyncStorage.setItem(DEVICE_CALENDAR_KEY, '1');
      return true;
    } catch {
      return false;
    }
  }, [supported]);

  const disconnect = useCallback(async () => {
    setEnabled(false);
    setEvents([]);
    await AsyncStorage.setItem(DEVICE_CALENDAR_KEY, '0').catch(() => undefined);
  }, []);

  return { supported, hydrated, enabled, events, connect, disconnect };
}

export function useCalendarWithDevice(month: Date) {
  const server = useOdysseyCalendar(month);
  const device = useDeviceCalendar(month);
  const items = mergeDeviceEvents(server.data ?? [], device.events);
  return { server, device, items };
}

export function useInvalidateOdysseyCalendar() {
  const qc = useQueryClient();
  return useCallback(() => {
    qc.invalidateQueries({ queryKey: ['odyssey', 'calendar'] });
  }, [qc]);
}
