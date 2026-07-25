import type { Translations } from '../../lib/i18n';

export function oauthErrorMessage(
  code: string | null,
  errors: Translations['auth']['errors'],
): string {
  const key = code?.replace(/^auth\./, '') as keyof typeof errors | undefined;
  return key && key in errors ? errors[key] : errors.unknown;
}
