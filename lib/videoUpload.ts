import { api } from './api';

// D-033 presigned direct-to-R2 multipart upload. Video bytes go straight
// from the device to R2 (§6.5 byte-bypass): the backend only signs part
// URLs and validates the finished object. 12MB parts sit inside the plan's
// 8–16MB window; each part retries independently with full jitter (MS-17).
const PART_SIZE = 12 * 1024 * 1024;
const PART_MAX_ATTEMPTS = 3;

export interface UploadedVideoMedia {
  media_url: string;
  thumb_url?: string | null;
  mime_type?: string | null;
  duration_seconds?: number | null;
}

interface InitiateResponse {
  key: string;
  upload_id: string;
  part_urls: string[];
  media_url: string;
}

function jitteredDelay(attempt: number): number {
  const cap = Math.min(8000, 500 * 2 ** attempt);
  return Math.floor(Math.random() * cap);
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function putPart(url: string, body: Blob): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt < PART_MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, { method: 'PUT', body });
      if (!response.ok) {
        throw new Error(`part upload failed: ${response.status}`);
      }
      const etag = response.headers.get('etag') ?? response.headers.get('ETag');
      if (!etag) {
        throw new Error('part upload returned no etag');
      }
      return etag.replaceAll('"', '');
    } catch (error) {
      lastError = error;
      if (attempt < PART_MAX_ATTEMPTS - 1) {
        await wait(jitteredDelay(attempt));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('part upload failed');
}

export async function uploadVideoDirect({
  uri,
  mimeType,
  sizeBytes,
  durationSeconds,
  onProgress,
}: {
  uri: string;
  mimeType: 'video/mp4' | 'video/quicktime';
  sizeBytes: number;
  durationSeconds: number;
  onProgress?: (fraction: number) => void;
}): Promise<UploadedVideoMedia> {
  const fileResponse = await fetch(uri);
  const blob = await fileResponse.blob();
  const totalBytes = blob.size || sizeBytes;
  const partCount = Math.max(1, Math.ceil(totalBytes / PART_SIZE));

  const initiate = await api.post('/community/media/video-upload/initiate', {
    mime_type: mimeType,
    size_bytes: totalBytes,
    duration_seconds: durationSeconds,
    part_count: partCount,
  });
  const { key, upload_id, part_urls } = initiate.data.data as InitiateResponse;

  const parts: Array<{ part_number: number; etag: string }> = [];
  try {
    for (let index = 0; index < partCount; index += 1) {
      const start = index * PART_SIZE;
      const end = Math.min(start + PART_SIZE, totalBytes);
      const etag = await putPart(part_urls[index], blob.slice(start, end));
      parts.push({ part_number: index + 1, etag });
      onProgress?.(end / totalBytes);
    }

    const complete = await api.post(
      '/community/media/video-upload/complete',
      { key, upload_id, parts, duration_seconds: durationSeconds },
      // 300MB uploads finish before this call, but completion assembles the
      // object server-side on R2 — give it the multipart-grade timeout.
      { timeout: 60000 },
    );
    return complete.data.data as UploadedVideoMedia;
  } catch (error) {
    // Best-effort cleanup so abandoned parts don't accrue storage.
    void api
      .post('/community/media/video-upload/abort', { key, upload_id })
      .catch(() => undefined);
    throw error;
  }
}
