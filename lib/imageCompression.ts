import * as ImageManipulator from 'expo-image-manipulator';

// MS-16: raw phone photos are 3–8MB; uploading them as-is is the dominant
// cost of posting-with-images on mobile/weak networks. Downscale the longest
// edge to MAX_EDGE and re-encode JPEG at COMPRESS before upload — a typical
// 4000×3000 5MB photo drops to ~200–400KB (10–20× less to transfer) with no
// visible quality loss at feed/detail sizes. Mirrors what Instagram/WhatsApp
// do client-side.
const MAX_EDGE = 1600;
const COMPRESS = 0.7;

export interface CompressedImage {
  uri: string;
  mimeType: string;
  fileName: string;
}

export async function compressImageForUpload(asset: {
  uri: string;
  width?: number | null;
  height?: number | null;
  fileName?: string | null;
}): Promise<CompressedImage> {
  const width = asset.width ?? 0;
  const height = asset.height ?? 0;
  const longest = Math.max(width, height);

  // Only resize when the image actually exceeds MAX_EDGE; always re-encode to
  // shed EXIF bloat and normalize to JPEG. Resizing by the longest edge keeps
  // aspect ratio (the omitted dimension is computed by the manipulator).
  const actions: ImageManipulator.Action[] = [];
  if (longest > MAX_EDGE) {
    actions.push(width >= height ? { resize: { width: MAX_EDGE } } : { resize: { height: MAX_EDGE } });
  }

  try {
    const result = await ImageManipulator.manipulateAsync(asset.uri, actions, {
      compress: COMPRESS,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    const base = (asset.fileName ?? `img-${Date.now()}`).replace(/\.[^.]+$/, '');
    return { uri: result.uri, mimeType: 'image/jpeg', fileName: `${base}.jpg` };
  } catch {
    // Manipulation failed (rare) — fall back to the original so the user can
    // still post; the upload is just larger.
    return {
      uri: asset.uri,
      mimeType: 'image/jpeg',
      fileName: asset.fileName ?? `img-${Date.now()}.jpg`,
    };
  }
}
