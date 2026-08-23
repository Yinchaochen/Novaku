import type { Translations } from './i18n';

/**
 * Turning a form validation failure into something a person can read (D-072).
 *
 * A Chinese-language composer showed "Too small: expected string to have >=4
 * characters" under an empty title. That string is Zod's own default, and it
 * reached the screen because two things lined up: the schema declared
 * `z.string().min(4)` without a message, and the screen rendered
 * `errors.title.message` verbatim. Either half alone is harmless. Together
 * they put a developer's sentence, in English, in front of a user.
 *
 * So schemas here declare a *code* rather than prose — the pattern
 * reset-password.tsx already used for `password_mismatch`, generalised — and
 * every screen resolves it through this function.
 *
 * The important property is the fallback. An unknown code returns the generic
 * message, never the raw string: a code somebody forgets to translate should
 * degrade to something vague and correct, not to English internals. That is
 * what makes this the last line rather than another place to be careful.
 */

export const FIELD_ERROR_CODES = [
  'email_invalid',
  'password_too_short',
  'password_mismatch',
  'name_required',
  'title_too_short',
  'title_too_long',
  'body_too_short',
  'body_too_long',
  'token_invalid',
  'required',
] as const;

export type FieldErrorCode = (typeof FIELD_ERROR_CODES)[number];

type ValidationCopy = Translations['validation'];

/** Readable text for one field error, or null when the field is fine. */
export function fieldErrorText(
  copy: ValidationCopy,
  error?: { message?: string } | null,
): string | null {
  if (!error) {
    return null;
  }
  const code = (error.message ?? '').trim();
  if (code && Object.prototype.hasOwnProperty.call(copy, code)) {
    return copy[code as keyof ValidationCopy];
  }
  // Unknown, empty, or a raw library string. The reader gets something true
  // and vague; what they must never get is the untranslated internals.
  return copy.generic;
}

/** True when a string is one of the codes this module knows how to render. */
export function isFieldErrorCode(value: unknown): value is FieldErrorCode {
  return typeof value === 'string' && (FIELD_ERROR_CODES as readonly string[]).includes(value);
}
