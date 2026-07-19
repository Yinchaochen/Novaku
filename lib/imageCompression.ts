import { File } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

const MAX_EDGE = 1600;
const COMPRESS = 0.7;
const RETRY_MAX_EDGE = 1280;
const RETRY_COMPRESS = 0.55;
export const MAX_UPLOAD_IMAGE_BYTES = 1_000_000;

export interface CompressedImage {
  uri: string;
  mimeType: string;
  fileName: string;
  byteSize: number;
  originalByteSize: number | null;
  compressionMs: number;
}

function resizeAction(
  width: number,
  height: number,
  maxEdge: number,
): ImageManipulator.Action[] {
  if (Math.max(width, height) <= maxEdge) return [];
  return [width >= height ? { resize: { width: maxEdge } } : { resize: { height: maxEdge } }];
}

async function readableSize(uri: string): Promise<number | null> {
  try {
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      return blob.size > 0 ? blob.size : null;
    }
    const size = new File(uri).size;
    return size > 0 ? size : null;
  } catch {
    return null;
  }
}

export async function compressImageForUpload(asset: {
  uri: string;
  width?: number | null;
  height?: number | null;
  fileName?: string | null;
  fileSize?: number | null;
}): Promise<CompressedImage> {
  const startedAt = Date.now();
  const width = asset.width ?? 0;
  const height = asset.height ?? 0;
  const originalByteSize = asset.fileSize && asset.fileSize > 0
    ? asset.fileSize
    : await readableSize(asset.uri);

  try {
    let result = await ImageManipulator.manipulateAsync(
      asset.uri,
      resizeAction(width, height, MAX_EDGE),
      {
        compress: COMPRESS,
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );
    let byteSize = await readableSize(result.uri);
    if (byteSize === null) throw new Error('image_size_unavailable');

    if (byteSize > MAX_UPLOAD_IMAGE_BYTES) {
      result = await ImageManipulator.manipulateAsync(
        result.uri,
        resizeAction(result.width, result.height, RETRY_MAX_EDGE),
        {
          compress: RETRY_COMPRESS,
          format: ImageManipulator.SaveFormat.JPEG,
        },
      );
      byteSize = await readableSize(result.uri);
      if (byteSize === null) throw new Error('image_size_unavailable');
    }

    if (byteSize > MAX_UPLOAD_IMAGE_BYTES) {
      throw new Error('image_too_large_after_compression');
    }

    const base = (asset.fileName ?? `img-${Date.now()}`).replace(/\.[^.]+$/, '');
    return {
      uri: result.uri,
      mimeType: 'image/jpeg',
      fileName: `${base}.jpg`,
      byteSize,
      originalByteSize,
      compressionMs: Date.now() - startedAt,
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'image_too_large_after_compression') {
      throw error;
    }
    throw new Error('image_compression_failed');
  }
}
