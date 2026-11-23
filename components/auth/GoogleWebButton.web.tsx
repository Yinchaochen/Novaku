import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import { env } from '../../lib/env';
import { buttonWidthFor } from '../../lib/googleButtonWidth';
import { loadScript } from '../../lib/loadScript';

const GOOGLE_WEB_CLIENT_ID = env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const GIS_SRC = 'https://accounts.google.com/gsi/client';

// App languages Google's button has text for (checked 2026-11-23); for the rest Google
// swaps in another language, sometimes the IP country's, so they get English.
const GOOGLE_LOCALES = new Set([
  'af', 'am', 'ar', 'az', 'be', 'bg', 'bn', 'bs', 'ca', 'cs', 'cy', 'da', 'de', 'el', 'en', 'es',
  'et', 'eu', 'fa', 'fi', 'fr', 'ga', 'gl', 'gu', 'he', 'hi', 'hr', 'hu', 'hy', 'id', 'is', 'it',
  'ja', 'ka', 'kk', 'km', 'kn', 'ko', 'ky', 'lo', 'lt', 'lv', 'mk', 'ml', 'mn', 'mr', 'ms', 'my',
  'ne', 'nl', 'no', 'or', 'pa', 'pl', 'pt', 'ro', 'ru', 'si', 'sk', 'sl', 'sq', 'sr', 'sv', 'sw',
  'ta', 'te', 'th', 'tl', 'tr', 'uk', 'ur', 'uz', 'vi', 'zh', 'zh-TW', 'zu',
]);

// `hl` on the script, not `locale`, sets the stand-in Google draws until its iframe loads
// (for good on localhost); without it English browsers in Germany got German. Loaded once.
let gisSrc: string | null = null;

type GoogleId = {
  initialize: (config: {
    client_id: string;
    callback: (response: { credential?: string }) => void;
    ux_mode: 'popup';
    auto_select: boolean;
    cancel_on_tap_outside: boolean;
  }) => void;
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

// initialize() is page-wide and should run once; the button that is on screen
// now receives the token.
let currentHandler: ((response: { credential?: string }) => void) | null = null;
let initialized = false;

function ensureInitialized(id: GoogleId) {
  if (initialized) return;
  id.initialize({
    client_id: GOOGLE_WEB_CLIENT_ID,
    callback: (response) => currentHandler?.(response),
    ux_mode: 'popup',
    auto_select: false,
    cancel_on_tap_outside: true,
  });
  initialized = true;
}

/**
 * Google's own "Continue with Google" button (D-151).
 *
 * A browser cannot get an id_token from a button of ours without a redirect
 * page and a registered redirect URI; Google's rendered button returns one
 * directly, and only needs this site listed as an authorized JavaScript origin
 * on the web client.
 */
export function GoogleWebButton({
  onIdToken,
  onError,
  disabled,
}: {
  onIdToken: (idToken: string) => void;
  onError: (code: string) => void;
  disabled?: boolean;
}) {
  const { langCode } = useLanguage();
  const container = useRef<HTMLDivElement | null>(null);
  // Holds the width the button will be drawn at, not the raw container width:
  // a scrollbar appearing beside the form changes the container by ~15px, and
  // re-drawing an identical 400px button for that emptied the container,
  // moved the content height back under the scroll threshold, and looped.
  const [width, setWidth] = useState(0);

  useEffect(() => {
    currentHandler = (response) => {
      if (response.credential) onIdToken(response.credential);
      else onError('auth.oauth_missing_id_token');
    };
    return () => {
      currentHandler = null;
    };
  }, [onIdToken, onError]);

  useEffect(() => {
    if (!GOOGLE_WEB_CLIENT_ID) {
      onError('auth.oauth_unconfigured');
      return;
    }
    if (!width || !container.current) return;
    let cancelled = false;
    const locale = GOOGLE_LOCALES.has(langCode) ? langCode : 'en';
    gisSrc ??= `${GIS_SRC}?hl=${locale}`;
    loadScript(gisSrc)
      .then(() => {
        const id = window.google?.accounts.id;
        if (cancelled || !id || !container.current) return;
        ensureInitialized(id);
        container.current.innerHTML = '';
        id.renderButton(container.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          logo_alignment: 'center',
          width,
          locale,
        });
      })
      .catch(() => {
        if (!cancelled) onError('auth.oauth_failed');
      });
    return () => {
      cancelled = true;
    };
    // onError is read once; re-rendering the button on every parent render would flicker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, langCode]);

  return (
    <View
      testID="auth.google.web"
      onLayout={(event) => {
        const measured = event.nativeEvent.layout.width;
        if (measured > 0) setWidth(buttonWidthFor(measured));
      }}
      style={{
        width: '100%',
        // Fixed, not min: the button is 40px and must never move the page's
        // height while Google redraws it, or a scrollbar flips on and off.
        height: 44,
        overflow: 'hidden',
        alignItems: 'center',
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      <div ref={container} />
    </View>
  );
}
