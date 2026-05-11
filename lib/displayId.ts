/**
 * Stable numeric "Postervia ID" for display only.
 *
 * The real identifier is `user.id` (a UUID). This 10-digit number is derived
 * deterministically from that UUID purely for UI presentation (Profile page,
 * QR code modal). Never use this for routing, follow targets, ownership
 * checks, or any business logic — those must always go through `user.id`.
 */
const ID_LENGTH = 10;

/** FNV-1a 32-bit hash. Tiny + dependency-free + good enough for display IDs. */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    // 32-bit FNV prime; force unsigned 32-bit arithmetic.
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Map a UUID (or any opaque user id string) to a stable 10-digit numeric ID.
 * Same input always produces the same output. Different UUIDs almost always
 * produce different display IDs (collision-free for the user counts we expect).
 */
export function numericDisplayId(userId: string | null | undefined): string {
  if (!userId) return '0'.repeat(ID_LENGTH);
  // Mix two FNV-1a hashes (original + reversed) into a 64-bit-ish combined
  // value, then take the lower digits. Avoids losing entropy when truncating.
  const a = fnv1a(userId);
  const b = fnv1a(userId.split('').reverse().join(''));
  // BigInt keeps the math precise; JS Number would lose precision past 2^53.
  const combined = (BigInt(a) * 0x100000000n + BigInt(b)).toString();
  return combined.slice(-ID_LENGTH).padStart(ID_LENGTH, '0');
}

/** Deep link payload for QR codes. Apps that scan it can route to the user. */
export function profileDeepLink(userId: string): string {
  return `postervia://profile/${userId}`;
}
