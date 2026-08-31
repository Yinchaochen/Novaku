import type { CommunityPost } from './useCommunity';

/**
 * The location facts a post detail shows, derived from the post alone.
 *
 * Lifted out of CommunityPostDetailModal on 2026-08-31, after a production
 * crash. This runs BETWEEN the modal's hooks, and a TypeError here aborts the
 * render partway through the hook list — so React's next render of the same
 * fiber reports "Rendered more hooks than during the previous render" and the
 * real error is discarded. The symptom names hooks; the cause is a payload
 * shape. Out here it is a pure function with a test, instead of an unguarded
 * loop wedged between a useRef and a useEffect.
 *
 * Every field is read defensively even where the type forbids it being
 * missing. The type describes what the API promises; this describes what the
 * screen survives.
 */

export function getSourceHost(sourceUrl: string | null | undefined) {
  if (!sourceUrl) return null;
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, '');
  } catch {
    return sourceUrl;
  }
}

function metadataString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null;
}

export function firstMetadataString(...values: unknown[]) {
  for (const value of values) {
    const normalized = metadataString(value);
    if (normalized) {
      return normalized;
    }
  }
  return null;
}

export function getLocationEntries(post: CommunityPost) {
  const entries: Array<{
    key: string;
    label: string;
    meta: string | null;
    sourceUrl: string | null;
    actionCandidateId: string | null;
  }> = [];
  const seen = new Set<string>();

  for (const candidate of post.action_candidates ?? []) {
    const cardType = typeof candidate.metadata_json?.['card_type'] === 'string' ? candidate.metadata_json.card_type : null;
    if (
      candidate.action_type !== 'visit_place' &&
      candidate.action_type !== 'reserve_place' &&
      cardType !== 'place_visit' &&
      cardType !== 'booking'
    ) {
      continue;
    }

    const label = firstMetadataString(candidate.metadata_json?.['place_name'], candidate.entity_name);
    const sourceUrl = candidate.source_url ?? post.source_url ?? null;
    if (!label) {
      continue;
    }
    const dedupeKey = sourceUrl ?? label;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);

    entries.push({
      key: dedupeKey,
      label,
      meta: firstMetadataString(
        candidate.metadata_json?.['location_hint'],
        post.city,
        post.author?.city,
        getSourceHost(sourceUrl),
      ),
      sourceUrl,
      actionCandidateId: candidate.id,
    });
  }

  if (entries.length > 0) {
    return entries;
  }

  if (post.source_url) {
    const fallbackLabel = firstMetadataString(post.city, post.author?.city);
    if (fallbackLabel) {
      return [
        {
          key: post.source_url,
          label: fallbackLabel,
          meta: getSourceHost(post.source_url),
          sourceUrl: post.source_url,
          actionCandidateId: null,
        },
      ];
    }
  }

  return [];
}
