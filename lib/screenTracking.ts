// How long each screen was open (D-200). The route pattern is kept, the id it shows goes
// to entity_id: "/(tabs)/plaza" -> "/plaza", "/p/[id]" + id -> "/p/[id]" with entity_id.

export interface ScreenViewItem {
  screen: string;
  entity_id: string | null;
  started_at: string;
  dwell_ms: number;
}

export interface OpenScreen {
  screen: string;
  entityId: string | null;
  startedAt: number;
}

type Params = Record<string, string | string[] | undefined>;

export function screenFromSegments(segments: readonly string[], params: Params): { screen: string; entityId: string | null } {
  const parts = segments.filter((part) => !(part.startsWith('(') && part.endsWith(')')));
  const screen = `/${parts.join('/')}`.slice(0, 80);
  const id = params.id;
  const entityId = parts.includes('[id]') && typeof id === 'string' && id ? id.slice(0, 64) : null;
  return { screen, entityId };
}

/** The finished view, or null when there was nothing open. */
export function closeScreen(open: OpenScreen | null, now: number): ScreenViewItem | null {
  if (!open) return null;
  return {
    screen: open.screen,
    entity_id: open.entityId,
    started_at: new Date(open.startedAt).toISOString(),
    dwell_ms: Math.max(0, now - open.startedAt),
  };
}

export function newScreenSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
