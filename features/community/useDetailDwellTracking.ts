import { useCallback, useEffect, useRef } from 'react';

import {
  getCommunitySessionId,
  type CommunityRecommendationContentContext,
  type CommunityRecommendationEventInput,
  type CommunityRecommendationFeedContext,
} from './useCommunity';

interface DetailDwellArgs {
  visible: boolean;
  detailKey: string | null;
  postId: string | null;
  surface: 'plaza_detail' | 'plaza_related';
  feedContext?: CommunityRecommendationFeedContext | null;
  contentContext?: CommunityRecommendationContentContext | null;
  track: (events: CommunityRecommendationEventInput[]) => void;
}

// One plaza_open_post when a post is opened, one plaza_dwell when it leaves.
// Only the key and visibility re-run the effect; the rest is read through a
// ref, so a refetched post object (after a like or a comment) no longer splits
// the dwell in two and drops had_downstream_signal (D-119 Addendum).
export function useDetailDwellTracking(args: DetailDwellArgs) {
  const latest = useRef(args);
  useEffect(() => {
    latest.current = args;
  });
  const startedAtRef = useRef<number | null>(null);
  const hadSignalRef = useRef(false);
  const { visible, detailKey } = args;

  useEffect(() => {
    const opened = latest.current;
    if (!visible || !detailKey || !opened.postId) {
      return;
    }
    const postId = opened.postId;
    const surface = opened.surface;
    startedAtRef.current = Date.now();
    hadSignalRef.current = false;
    opened.track([
      {
        event_name: 'plaza_open_post',
        session_id: getCommunitySessionId(),
        surface,
        post_id: postId,
        feed_context: opened.feedContext ?? undefined,
        content_context: opened.contentContext ?? undefined,
      },
    ]);

    return () => {
      const startedAt = startedAtRef.current;
      const hadSignal = hadSignalRef.current;
      startedAtRef.current = null;
      hadSignalRef.current = false;
      if (!startedAt) {
        return;
      }
      const dwellMs = Math.max(Date.now() - startedAt, 0);
      if (dwellMs <= 0) {
        return;
      }
      // Cleanups run before any effect of the next commit, so this is still
      // the post that was open, with whatever context its latest copy carried.
      const current = latest.current;
      current.track([
        {
          event_name: 'plaza_dwell',
          session_id: getCommunitySessionId(),
          surface,
          post_id: postId,
          feed_context: current.feedContext ?? undefined,
          content_context: current.contentContext ?? undefined,
          dwell_ms: dwellMs,
          had_downstream_signal_in_session: hadSignal,
        },
      ]);
    };
  }, [visible, detailKey]);

  const markDownstreamSignal = useCallback(() => {
    hadSignalRef.current = true;
  }, []);

  return { markDownstreamSignal };
}
