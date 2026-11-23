interface ConsentRow {
  consent_type: string;
  granted: boolean;
  revoked_at: string | null;
}

/**
 * Whether the person's latest record for this consent stands. The server lists
 * records newest first, and a withdrawn consent keeps granted=true with revoked_at set.
 */
export function consentGranted(records: readonly ConsentRow[] | undefined, type: string): boolean {
  const latest = records?.find((record) => record.consent_type === type);
  return Boolean(latest && latest.granted && !latest.revoked_at);
}
