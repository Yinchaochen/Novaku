import * as VideoThumbnails from 'expo-video-thumbnails';

import { compressImageForUpload } from '../../lib/imageCompression';
import { UploadedVideoMedia, uploadVideoDirect } from '../../lib/videoUpload';
import type { CommunityPostMedia } from './useCommunity';

// D-033 client pipeline: validate → compress (720p/~2Mbps, native builds
// only) → sample frames for moderation → presigned direct upload. The
// backend never sees video bytes; frames ride the existing image path.
export const VIDEO_MAX_DURATION_SECONDS = 15 * 60;
export const VIDEO_MAX_SIZE_BYTES = 300 * 1024 * 1024;

export type VideoPickPhase = 'compressing' | 'frames' | 'uploading';

export class VideoValidationError extends Error {
  constructor(public readonly code: 'too_long' | 'too_large' | 'unsupported') {
    super(code);
    this.name = 'VideoValidationError';
  }
}

export interface PickedVideoAsset {
  uri: string;
  mimeType?: string | null;
  fileSize?: number | null;
  /** expo-image-picker reports milliseconds. */
  duration?: number | null;
}

export interface PreparedVideo {
  media: UploadedVideoMedia & Pick<CommunityPostMedia, 'thumb_url' | 'duration_seconds'>;
  frameUrls: string[];
}

type CompressedUpload = Awaited<ReturnType<typeof compressImageForUpload>>;

function resolveMime(asset: PickedVideoAsset): 'video/mp4' | 'video/quicktime' | null {
  const mime = (asset.mimeType ?? '').toLowerCase();
  if (mime === 'video/mp4' || mime === 'video/quicktime') {
    return mime;
  }
  const uri = asset.uri.toLowerCase();
  if (uri.endsWith('.mp4')) return 'video/mp4';
  if (uri.endsWith('.mov')) return 'video/quicktime';
  return null;
}

async function compressIfAvailable(
  uri: string,
  onProgress: (fraction: number) => void,
): Promise<string> {
  try {
    // react-native-compressor is a native module (EAS builds only) — in Expo
    // Go / web the require fails and the original file is used as-is, still
    // subject to the 300MB cap.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Video } = require('react-native-compressor');
    const compressed = await Video.compress(
      uri,
      { compressionMethod: 'auto', maxSize: 1280, progressDivider: 5 },
      (progress: number) => onProgress(Math.min(1, Math.max(0, progress))),
    );
    return compressed || uri;
  } catch {
    onProgress(1);
    return uri;
  }
}

async function blobSize(uri: string): Promise<number> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob.size;
}

export async function processAndUploadVideo({
  asset,
  uploadImage,
  onPhase,
}: {
  asset: PickedVideoAsset;
  /** The existing small-file image uploader (frames + cover ride it). */
  uploadImage: (input: CompressedUpload) => Promise<{ media_url: string }>;
  onPhase?: (phase: VideoPickPhase, progress: number) => void;
}): Promise<PreparedVideo> {
  const mimeType = resolveMime(asset);
  if (!mimeType) {
    throw new VideoValidationError('unsupported');
  }
  const durationSeconds = Math.round((asset.duration ?? 0) / 1000);
  if (durationSeconds > VIDEO_MAX_DURATION_SECONDS) {
    throw new VideoValidationError('too_long');
  }
  if ((asset.fileSize ?? 0) > VIDEO_MAX_SIZE_BYTES * 2) {
    // Wildly oversized originals are rejected before burning compression time.
    throw new VideoValidationError('too_large');
  }

  onPhase?.('compressing', 0);
  const compressedUri = await compressIfAvailable(asset.uri, (fraction) =>
    onPhase?.('compressing', fraction),
  );
  const sizeBytes = await blobSize(compressedUri);
  if (sizeBytes > VIDEO_MAX_SIZE_BYTES) {
    throw new VideoValidationError('too_large');
  }

  // ~1 frame/minute, 5–15 total (plan §3): moderation samples plus the cover.
  onPhase?.('frames', 0);
  const frameCount = Math.min(15, Math.max(5, Math.round(durationSeconds / 60) || 5));
  const durationMs = Math.max(1000, (asset.duration ?? durationSeconds * 1000) as number);
  const frameUrls: string[] = [];
  for (let index = 0; index < frameCount; index += 1) {
    const time = Math.floor(((index + 0.5) / frameCount) * durationMs);
    try {
      const thumbnail = await VideoThumbnails.getThumbnailAsync(asset.uri, {
        time,
        quality: 0.6,
      });
      const compressed = await compressImageForUpload({
        uri: thumbnail.uri,
        width: thumbnail.width,
        height: thumbnail.height,
      });
      const uploaded = await uploadImage(compressed);
      frameUrls.push(uploaded.media_url);
    } catch {
      // A missing frame narrows the moderation sample; the backend demands
      // at least 3, so partial failures are tolerated here and surfaced by
      // create-time validation when extraction went badly wrong.
    }
    onPhase?.('frames', (index + 1) / frameCount);
  }
  if (frameUrls.length < 3) {
    throw new VideoValidationError('unsupported');
  }

  const uploaded = await uploadVideoDirect({
    uri: compressedUri,
    mimeType,
    sizeBytes,
    durationSeconds,
    onProgress: (fraction) => onPhase?.('uploading', fraction),
  });

  return {
    media: {
      ...uploaded,
      thumb_url: frameUrls[0],
      duration_seconds: durationSeconds,
      mime_type: uploaded.mime_type ?? mimeType,
    },
    frameUrls,
  };
}
