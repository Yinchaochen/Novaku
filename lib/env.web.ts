import { z } from 'zod';

const WebEnvSchema = z.object({
  EXPO_PUBLIC_API_URL: z.string().url(),
  EXPO_PUBLIC_SENTRY_DSN: z
    .string()
    .startsWith('https://', { message: 'EXPO_PUBLIC_SENTRY_DSN must be an https:// DSN' })
    .optional(),
  EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().min(1).optional(),
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: z.string().optional(),
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: z.string().optional(),
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: z.string().optional(),
});

function blankToUndefined(value: string | undefined) {
  return value && value.trim().length > 0 ? value : undefined;
}

function _parseWebEnv() {
  const raw = {
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    EXPO_PUBLIC_SENTRY_DSN: blankToUndefined(process.env.EXPO_PUBLIC_SENTRY_DSN),
    EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: blankToUndefined(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY),
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  };
  const parsed = WebEnvSchema.safeParse(raw);
  if (parsed.success) {
    return {
      ...parsed.data,
      EXPO_PUBLIC_SENTRY_DSN: parsed.data.EXPO_PUBLIC_SENTRY_DSN ?? '',
    };
  }

  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  // eslint-disable-next-line no-console
  console.error(`[env:web] Invalid EXPO_PUBLIC_* environment:\n${issues}`);
  throw new Error('Invalid EXPO_PUBLIC_* environment configuration. See console for details.');
}

export const env = _parseWebEnv();
