import { Redirect } from 'expo-router';

// Always show the welcome / brand-reveal screen first. Welcome.tsx runs a
// 1-second timer then redirects auth-aware: authenticated → plaza, else login.
export default function Index() {
  return <Redirect href="/(auth)/welcome" />;
}
