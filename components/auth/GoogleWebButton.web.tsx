import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import { env } from '../../lib/env';
import { loadScript } from '../../lib/loadScript';

const GOOGLE_WEB_CLIENT_ID = env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const GIS_SRC = 'https://accounts.google.com/gsi/client';

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
    loadScript(GIS_SRC)
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
          // Google caps the button at 400px.
          width: Math.min(400, Math.max(200, Math.floor(width))),
          locale: langCode,
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
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{
        width: '100%',
        minHeight: 44,
        alignItems: 'center',
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      <div ref={container} />
    </View>
  );
}
