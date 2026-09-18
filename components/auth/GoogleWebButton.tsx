// The browser build renders Google's own button (GoogleWebButton.web.tsx);
// the apps use GoogleSignInButton with the native SDKs instead.
export function GoogleWebButton(_props: {
  onIdToken: (idToken: string) => void;
  onError: (code: string) => void;
  disabled?: boolean;
}) {
  return null;
}
