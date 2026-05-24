import { z } from 'zod';

/**
 * P3.7 — Runtime validation of every EXPO_PUBLIC_* env var.
 *
 * The IOS-LOGIN-105 retro showed why this matters: EXPO_PUBLIC_SENTRY_DSN
 * was pointing at the wrong Sentry project for weeks because nothing
 * validated the shape of these vars at runtime — `process.env.X` just
 * silently returned the wrong string. With this Zod schema, an EAS build
 * that ships with a missing or malformed env var throws loudly on app
 * start with a message naming the offending variable.
 *
 * Importing from this module is the only sanctioned way to read public env
 * vars going forward. Search for `process.env.EXPO_PUBLIC_` to find any
 * remaining direct reads to migrate.
 */

const EnvSchema = z.object({
  /** Backend API base URL, e.g. https://api.postervia.app/v1 */
  EXPO_PUBLIC_API_URL: z.string().url(),

  /**
   * Sentry DSN for postervia-ios project. Must start with https:// — an
   * empty string here silently disables Sentry, which is a configuration
   * mistake we want to catch at startup, not weeks later via "No activity
   * yet" on a Sentry dashboard.
   */
  EXPO_PUBLIC_SENTRY_DSN: z
    .string()
    .startsWith('https://', { message: 'EXPO_PUBLIC_SENTRY_DSN must be an https:// DSN' }),

  /** Google Maps JavaScript / SDK key. Empty string allowed in dev. */
  EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().min(1).optional(),

  /** Google OAuth client IDs (per platform). Empty = OAuth disabled. */
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: z.string().optional(),
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: z.string().optional(),
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: z.string().optional(),
});

function _parseEnv() {
  const raw = {
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
    EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  };
  const parsed = EnvSchema.safeParse(raw);
  if (parsed.success) {
    return parsed.data;
  }
  // Loud, parseable error message. In dev this surfaces in Metro logs; in
  // prod it's an uncaught throw that the global error handler captures to
  // Sentry (if Sentry is reachable) or otherwise crashes the bundle load.
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  // eslint-disable-next-line no-console
  console.error(`[env] Invalid EXPO_PUBLIC_* environment:\n${issues}`);
  throw new Error(
    `Invalid EXPO_PUBLIC_* environment configuration. See console for details.`,
  );
}

/**
 * The validated env object. Import this in any file that needs an
 * EXPO_PUBLIC_* var — never read `process.env.EXPO_PUBLIC_*` directly.
 *
 * Note: Expo SDK inlines `process.env.EXPO_PUBLIC_*` at bundle time, so
 * importing/destructuring at module top-level is correct (no runtime
 * fetching needed).
 */
export const env = _parseEnv();
