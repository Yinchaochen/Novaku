# Novaku UI System

This directory is the agent-operable entrypoint for Novaku/Postervia UI work.
It turns design rules into callable interfaces, templates, and verification
surfaces. Read this before changing Expo / React Native screens, components, or
layout.

## Core Rule

Correct UI should be the easiest path.

Do not ask agents to remember scattered prose rules. Put invariants behind
interfaces:

- `components/Screen.tsx` owns screen framing.
- `theme/layout.ts` owns tab-bar geometry.
- `theme/tokens.ts` owns visual tokens.
- `app/dev/*` owns render-before-done verification states.
- Recipes own product-specific UI patterns once they repeat or carry risky
  layout behavior.

## Current Layers

### Foundation

- `theme/tokens.ts`: colors, gradients, radius, spacing, shadows, typography.
- `theme/layout.ts`: floating tab bar height and inset floor.
- `docs/MOBILE_PLATFORM_GOTCHAS.md` section 9: UI implementation closure.

### Primitives

- `Screen`
- `PageHeader`
- `GlassCard`
- `SurfaceCard`
- `ListRow`
- `StateBlock` (`EmptyState`, `LoadingState`, `ErrorState`)
- `GradientButton`
- `IconCircleButton`
- `Pill`
- `SectionLabel`
- `StackedButton`

Use primitives before composing raw `View`, `Text`, and `Pressable` layout.

### Recipes

Recipes are Novaku-specific compositions: task-line card, Plaza post card,
comment row, chat bubble, network banner, composer sheet, and similar product
patterns. A route-local recipe should be extracted when it appears twice or when
it owns a platform-sensitive invariant.

The Odyssey native/web card drift is the canonical example: the visual shell was
stored inside a `Pressable` callback style. The fix was to make the shell a
static `View` and keep `Pressable` as the hit layer.

Current extracted recipe:

- `features/auth/OAuthRegistrationForm.tsx`: Google/Apple fallback confirmation for
  unavailable or declined platform age ranges; the 16+ fast path and fallback are
  both rendered by `/dev/auth-oauth`.
- `components/recipes/OdysseyTaskLineCard.tsx`: task-line card used by
  `app/(tabs)/tasks.tsx`; shell is static, hit layer is pressable.
- `features/community/CommunityPostImageViewer.tsx`: full-screen Plaza image
  viewer with high-contrast multi-image paging controls and single-image
  control suppression; rendered by `/dev/ui-system`.
- `components/guide/SpotlightOverlay.tsx` + `spotlightParts.tsx`: the
  walkthrough spotlight behind the Plaza, Buddy and Social tours. `Spotlight`
  cuts a rounded hole and breathes it together with the ring (D-120); the
  scrim never takes touches. Rendered by `/dev/product-guide`,
  `/dev/buddy-guide`, `/dev/social-guide`.
- `features/community/CommunityPostCard.tsx` + `components/community/PostCover.tsx`:
  the feed card and the cover a text-only post gets. The picture slot's aspect
  comes from stored media dimensions before layout (`lib/cardAspect.ts`,
  D-078); rendered by `/dev/plaza-card`, `/dev/plaza-cover`, `/dev/seeded-posts`.
- `components/community/FeedFilterRow.tsx`: the Plaza browse axis, on the band
  (D-086); rendered by `/dev/plaza-filters`.
- `features/community/RelatedPostsSection.tsx`: the rail under a post's
  comments (D-097); empty, loading and error render nothing. `/dev/related-posts`.
- `components/odyssey/OdysseyCalendarSection.tsx` + `PlanWhenSheet.tsx`: the
  Odyssey calendar and the plan-when sheet after add-to-odyssey (D-083); the
  sheet never blocks the save. `/dev/odyssey-calendar`.
- `components/datetime/EventDateTimeField.tsx`: optional event date and time on
  the composer (D-105). No gallery yet.
- `components/OfficialChip.tsx`, `components/VerifiedBadge.tsx`: byline chip
  (reads "Editor", D-065) and the brand-mark account badge (D-063).
  `/dev/official-chip`.

### Verification

The dev gallery is the verification surface:

- `/dev/product-guide`, `/dev/buddy-guide`, `/dev/social-guide`
- `/dev/plaza-card`, `/dev/plaza-cover`, `/dev/plaza-filters`,
  `/dev/plaza-search`, `/dev/related-posts`, `/dev/seeded-posts`,
  `/dev/official-chip`, `/dev/video-post`
- `/dev/odyssey-calendar`, `/dev/app-update`, `/dev/city-location`,
  `/dev/buddy-wish`
- `/dev/auth-oauth`
- `/dev/screen-preview`
- `/dev/ui-system`
- `/dev/components`
- `/dev/button-audit`
- `/dev/network-resilience`

Before marking UI work done, render the relevant route and cover:

- normal
- long German
- empty
- loading
- own/self
- other
- disabled/error/weak-network when relevant

## Agent Workflow

1. Read `manifest.json`.
2. Classify the work: foundation, primitive, recipe, or screen.
3. Use an existing blessed interface before writing custom layout.
4. Add or update a dev gallery state when introducing reusable UI or risky
   layout behavior.
5. Run:

```bash
npm run verify:ui
npx tsc --noEmit --pretty false
npm run build:web
```

6. Report what was verified and what still needs real-device or Maestro checks.

## Forbidden Shortcuts

- Route screens manually composing background, safe area, keyboard, and tab bar
  padding.
- Hard-coded tab bar padding or copied inset formulas.
- Essential card/shell layout stored only in a `Pressable` callback style.
- User-visible copy outside i18n.
- Declaring UI done without long-copy and empty/loading state coverage.
- Measuring a loaded picture and resizing its frame after layout; sizes come
  from stored media dimensions (`lib/cardAspect.ts`).
- A spotlight scrim built from rectangles, or a ring animated apart from its
  hole; use `Spotlight` inside `SpotlightOverlay`.

## Related Decisions

- `collaboration/DECISIONS.md` D-035: UI implementation closure.
- `collaboration/DECISIONS.md` D-050 / D-054 / D-060 / D-120: the spotlight
  walkthroughs and their shared container.
- `collaboration/DECISIONS.md` D-078 / D-119: image frames sized before layout.
- `collaboration/PERSONA.md` MS-19: Agent-operable design system.
