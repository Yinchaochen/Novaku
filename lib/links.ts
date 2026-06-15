import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

export type TextSegment =
  | { type: 'text'; value: string }
  | { type: 'link'; value: string; href: string };

// ASCII URL chars (RFC 3986); excludes CJK so a URL directly followed by
// non-Latin text (no separating space, common in zh/ja) isn't swallowed.
const URL_SRC = String.raw`https?:\/\/[\w.~:/?#@!$&'()*+,;=%\[\]-]+`;
const EMAIL_SRC = String.raw`[\w.+-]+@[\w-]+(?:\.[\w-]+)+`;
const PHONE_SRC = String.raw`\+?\d[\d\s()./-]{5,}\d`;
const TOKEN_SRC = `(${URL_SRC})|(${EMAIL_SRC})|(${PHONE_SRC})`;

// Strip trailing sentence punctuation, but keep a ")" that balances a "(" in the
// URL itself (e.g. .../wiki/Foo_(bar)).
function trimTrailingPunctuation(url: string): string {
  let result = url;
  while (result.length > 0) {
    const last = result[result.length - 1];
    if (last === ')') {
      const opens = (result.match(/\(/g) ?? []).length;
      const closes = (result.match(/\)/g) ?? []).length;
      if (closes <= opens) break;
    } else if (!".,!?;:'".includes(last)) {
      break;
    }
    result = result.slice(0, -1);
  }
  return result;
}

// Phone candidates are noisy (dates/prices/times). Only accept a tel: link when
// the digit count looks like a real number: international (+) ≥7, else ≥9 so
// 8-digit dates like 2026-06-12 stay plain text.
function phoneHref(candidate: string): string | null {
  const hasPlus = candidate.trimStart().startsWith('+');
  const digits = candidate.replace(/\D/g, '');
  if (digits.length > 15) return null;
  if (hasPlus ? digits.length < 7 : digits.length < 9) return null;
  return `tel:${hasPlus ? '+' : ''}${digits}`;
}

export function splitTextWithLinks(text: string | null | undefined): TextSegment[] {
  const segments: TextSegment[] = [];
  if (!text) return segments;
  const re = new RegExp(TOKEN_SRC, 'gi');
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    let value = match[0];
    let href: string | null;
    if (match[1] !== undefined) {
      value = trimTrailingPunctuation(match[1]);
      href = value;
    } else if (match[2] !== undefined) {
      href = `mailto:${value}`;
    } else {
      href = phoneHref(value);
      if (href === null) continue; // not a real number — leave as plain text
    }
    const start = match.index;
    if (start > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, start) });
    }
    segments.push({ type: 'link', value, href });
    lastIndex = start + value.length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return segments;
}

export function firstUrl(text: string | null | undefined): string | null {
  for (const segment of splitTextWithLinks(text)) {
    if (segment.type === 'link' && /^https?:\/\//i.test(segment.href)) {
      return segment.href;
    }
  }
  return null;
}

export async function openExternalUrl(href: string): Promise<void> {
  try {
    if (/^https?:\/\//i.test(href)) {
      await WebBrowser.openBrowserAsync(href);
    } else {
      await Linking.openURL(href);
    }
  } catch {
    // Best-effort: there is no user-facing surface for a failed open.
  }
}
