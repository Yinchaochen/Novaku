import { useEffect, useState } from 'react';

import { coverFaceLoaded, loadCoverFace, type CoverFace } from '../lib/coverFonts';

/**
 * Whether a cover may set text in this face yet. A Chinese face is loaded the
 * first time a cover asks for it; until then the cover draws in the system
 * face and redraws when the load lands. The answer comes from expo-font every
 * render, never from stale state, so a face that is not registered is never
 * handed to a Text (iOS warns on an unknown family).
 */
export function useCoverFaceReady(face: CoverFace | null): boolean {
  const [, redraw] = useState(0);
  const loaded = coverFaceLoaded(face);
  useEffect(() => {
    if (!face || loaded) return;
    let live = true;
    loadCoverFace(face).then(
      () => {
        if (live) redraw((n) => n + 1);
      },
      () => {},
    );
    return () => {
      live = false;
    };
  }, [face, loaded]);
  return loaded;
}
