# Postervia Web (Expo Web) - run, build, deploy

The real app, compiled to the browser via `react-native-web`, talking to the
live backend. Use it for fast real-device testing without waiting on an EAS build.

## 0. Prereq - point at the live API

The web build requires `EXPO_PUBLIC_API_URL`. Put the production API in `novaku-app/.env`:

```env
EXPO_PUBLIC_API_URL=https://api.postervia.app/v1
```

Expo auto-loads `.env`. The app will not start without this, because env validation throws.

Native release-only variables such as `EXPO_PUBLIC_SENTRY_DSN` are optional on web. If you do set
`EXPO_PUBLIC_SENTRY_DSN`, it still must be a real `https://` DSN.

## 1. Run locally (fastest loop)

```powershell
cd F:\Yolu\novaku-app
npx expo start --web
```

Open `http://localhost:8081` in your browser. Hard-reload after edits. HMR usually handles it.
The prod backend already allows `http://localhost:8081` for CORS (`config.py` `cors_origins`).

If the bundler errors on a native-only module, paste the error. It means another module needs a
`.web` shim (see "How web shims work" below).

## 2. Production build + deploy

```powershell
cd F:\Yolu\novaku-app
npx expo export -p web
npx eas deploy
```

`expo export` writes the static site to `dist/`. `eas deploy` needs you logged into EAS and prints
the live URL. After deploy, add the printed origin, such as `https://<name>.expo.app`, to backend
`cors_origins` and redeploy the backend, or login/data calls will be CORS-blocked.

A custom domain such as `app.postervia.app` can be mapped in the EAS Hosting dashboard later.

## What works on web vs. app-only

| Works on web | App-only, gracefully stubbed on web |
|---|---|
| Email + password login | Google / Apple sign-in |
| Browse Plaza / Odyssey / Profile | Map place-picker (`LocationPicker`) |
| Chat text, comments, follows | QR scan (`scan`) |
| Most read/write flows | Native share sheet; web shares link/text only |

## How web shims work

Metro auto-resolves `Foo.web.tsx` over `Foo.tsx` when bundling for web. Native-only modules get a
`.web` sibling that avoids the native import:

- `lib/env.web.ts` - web env validation; API URL required, native release vars optional
- `lib/sentry.web.ts` - no-op browser shim, no native Sentry config required for web
- `lib/share.web.ts` - Web Share API / messenger URLs / copy, no `react-native-share`
- `features/auth/useOAuth.web.ts` - no-op OAuth, no `@react-native-google-signin`
- `components/LocationPicker.web.tsx` - "use the app" stub, no `react-native-maps`

`lib/secureStore.ts` already falls back to `localStorage` on web, so tokens persist.

To add a shim for a newly discovered breaker: create `<file>.web.tsx` exporting the same names/types
as the native file, implemented without the native module.
