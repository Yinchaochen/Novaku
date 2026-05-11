import { API_BASE } from './api';

function isBrokenR2Url(value: string) {
  try {
    const url = new URL(value);
    return url.hostname.endsWith('.r2.cloudflarestorage.com');
  } catch {
    return false;
  }
}

export function resolveMediaUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  if (!isBrokenR2Url(value)) {
    return value;
  }

  return `${API_BASE}/community/media/proxy?source_url=${encodeURIComponent(value)}`;
}
