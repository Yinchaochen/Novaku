import { API_BASE } from './api';

function isBrokenR2Url(value: string) {
  try {
    const url = new URL(value);
    return url.hostname.endsWith('.r2.cloudflarestorage.com');
  } catch {
    return false;
  }
}

export function resolveMediaUrl(value?: string | null, options?: { kind?: 'image' | 'video' }) {
  if (!value) {
    return null;
  }

  if (!isBrokenR2Url(value)) {
    return value;
  }

  // D-033 §6.5: video NEVER falls back to the backend proxy — a broken public
  // media base must surface as a broken player, not as hundreds of megabytes
  // streaming through Railway. Images keep the proxy as a last-resort.
  if (options?.kind === 'video') {
    return null;
  }

  return `${API_BASE}/community/media/proxy?source_url=${encodeURIComponent(value)}`;
}
