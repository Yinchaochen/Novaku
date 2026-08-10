import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

// The backend now varies the order between feed sessions (D-062), but the app
// only asks for a new one when a query is stale AND something remounts:
// refetchOnWindowFocus is off, so coming back from the background used to show
// the exact same list forever. This closes that gap.
//
// The threshold exists so a glance at a notification does not reshuffle the
// feed under someone mid-scroll — a return after this long reads as "opening
// the app again", not as "still reading".
export const FEED_FOREGROUND_REFRESH_MS = 10 * 60 * 1000;

/**
 * Decides what a foreground event should do. Pure so the timing rule is
 * testable without faking AppState.
 */
export function shouldRefreshOnForeground(
  previous: AppStateStatus,
  next: AppStateStatus,
  lastRefreshedAt: number,
  now: number,
): boolean {
  const cameBack = previous.match(/inactive|background/) !== null && next === 'active';
  return cameBack && now - lastRefreshedAt >= FEED_FOREGROUND_REFRESH_MS;
}

/**
 * Trims an infinite-query cache back to its first page. Refetching every
 * loaded page would fire one request per page and stitch a new page 1 onto
 * pages ordered by the previous session's seed; dropping to page 1 keeps the
 * list coherent and costs a single request. Page 1 stays visible while it
 * refetches, so there is no loading flash.
 */
export function firstPageOnly<T>(data: T | undefined): T | undefined {
  const page = data as { pages?: unknown[]; pageParams?: unknown[] } | undefined;
  if (!page?.pages || page.pages.length <= 1) return data;
  return { ...page, pages: page.pages.slice(0, 1), pageParams: page.pageParams?.slice(0, 1) } as T;
}

/**
 * Asks for a fresh feed session when the app returns to the foreground after a
 * real absence. `queryKey` is the caller's feed key so this stays usable for
 * any list that wants the same behaviour.
 */
export function useFeedForegroundRefresh(queryKey: readonly unknown[], enabled = true) {
  const queryClient = useQueryClient();
  const lastRefreshedAt = useRef(Date.now());
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!enabled) return;
    const subscription = AppState.addEventListener('change', (next) => {
      const previous = appState.current;
      appState.current = next;
      if (!shouldRefreshOnForeground(previous, next, lastRefreshedAt.current, Date.now())) return;
      lastRefreshedAt.current = Date.now();
      queryClient.setQueryData(queryKey, firstPageOnly);
      void queryClient.invalidateQueries({ queryKey });
    });
    return () => subscription.remove();
    // queryKey is an array literal at the call site; join it so a new array
    // with the same contents does not re-register the listener every render.
  }, [enabled, queryClient, queryKey.join('|')]);
}
