export function formatDisplayLocation(value?: string | null): string | null {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }

  if (normalized.includes('://') || normalized.includes('/')) {
    return normalized;
  }

  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(normalized)) {
    return normalized;
  }

  if (normalized !== normalized.toLowerCase() || !/[a-z]/.test(normalized)) {
    return normalized;
  }

  return normalized.replace(/\b([a-z])/g, (match) => match.toUpperCase());
}
