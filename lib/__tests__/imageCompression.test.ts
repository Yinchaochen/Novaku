import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

import { compressImageForUpload } from '../imageCompression';

const mockFileSizes = new Map<string, number>();

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation((uri: string) => ({
    size: mockFileSizes.get(uri) ?? 0,
  })),
}));

const manipulateAsync = ImageManipulator.manipulateAsync as jest.Mock;

describe('compressImageForUpload', () => {
  beforeEach(() => {
    (Platform as { OS: string }).OS = 'android';
    mockFileSizes.clear();
    mockFileSizes.set('file:///compressed.jpg', 420_000);
    manipulateAsync.mockReset();
    manipulateAsync.mockResolvedValue({ uri: 'file:///compressed.jpg', width: 1600, height: 1200 });
  });

  it('resizes by width when landscape exceeds MAX_EDGE', async () => {
    await compressImageForUpload({ uri: 'file:///a.jpg', width: 4000, height: 3000 });
    expect(manipulateAsync).toHaveBeenCalledWith(
      'file:///a.jpg',
      [{ resize: { width: 1600 } }],
      { compress: 0.7, format: 'jpeg' },
    );
  });

  it('resizes by height when portrait exceeds MAX_EDGE', async () => {
    await compressImageForUpload({ uri: 'file:///a.jpg', width: 3000, height: 4000 });
    expect(manipulateAsync).toHaveBeenCalledWith(
      'file:///a.jpg',
      [{ resize: { height: 1600 } }],
      { compress: 0.7, format: 'jpeg' },
    );
  });

  it('re-encodes without resizing when image is already small', async () => {
    await compressImageForUpload({ uri: 'file:///small.jpg', width: 800, height: 600 });
    expect(manipulateAsync).toHaveBeenCalledWith('file:///small.jpg', [], {
      compress: 0.7,
      format: 'jpeg',
    });
  });

  it('re-encodes without resizing when dimensions are unknown', async () => {
    await compressImageForUpload({ uri: 'file:///unknown.jpg' });
    expect(manipulateAsync).toHaveBeenCalledWith('file:///unknown.jpg', [], {
      compress: 0.7,
      format: 'jpeg',
    });
  });

  it('normalizes the file name to .jpg and keeps the base name', async () => {
    const out = await compressImageForUpload({
      uri: 'file:///a.png',
      width: 100,
      height: 100,
      fileName: 'holiday photo.png',
      fileSize: 3_200_000,
    });
    expect(out).toMatchObject({
      uri: 'file:///compressed.jpg',
      mimeType: 'image/jpeg',
      fileName: 'holiday photo.jpg',
      byteSize: 420_000,
      originalByteSize: 3_200_000,
    });
    expect(out.compressionMs).toBeGreaterThanOrEqual(0);
  });

  it('rejects instead of silently uploading the original when manipulation throws', async () => {
    manipulateAsync.mockRejectedValue(new Error('native failure'));
    await expect(
      compressImageForUpload({
        uri: 'file:///original.jpg',
        width: 4000,
        height: 3000,
        fileName: 'orig.jpg',
        fileSize: 5_000_000,
      }),
    ).rejects.toThrow('image_compression_failed');
  });

  it('recompresses an oversized first result before returning it', async () => {
    mockFileSizes.set('file:///compressed.jpg', 1_400_000);
    mockFileSizes.set('file:///compressed-small.jpg', 720_000);
    manipulateAsync
      .mockResolvedValueOnce({ uri: 'file:///compressed.jpg', width: 1600, height: 1200 })
      .mockResolvedValueOnce({ uri: 'file:///compressed-small.jpg', width: 1280, height: 960 });

    const out = await compressImageForUpload({
      uri: 'file:///large.jpg',
      width: 4000,
      height: 3000,
      fileName: 'large.jpg',
      fileSize: 6_000_000,
    });

    expect(manipulateAsync).toHaveBeenNthCalledWith(
      2,
      'file:///compressed.jpg',
      [{ resize: { width: 1280 } }],
      { compress: 0.55, format: 'jpeg' },
    );
    expect(out.byteSize).toBe(720_000);
  });

  it('rejects when the retry still exceeds the upload byte budget', async () => {
    mockFileSizes.set('file:///compressed.jpg', 1_400_000);
    mockFileSizes.set('file:///compressed-small.jpg', 1_100_000);
    manipulateAsync
      .mockResolvedValueOnce({ uri: 'file:///compressed.jpg', width: 1600, height: 1200 })
      .mockResolvedValueOnce({ uri: 'file:///compressed-small.jpg', width: 1280, height: 960 });

    await expect(
      compressImageForUpload({
        uri: 'file:///large.jpg',
        width: 4000,
        height: 3000,
        fileName: 'large.jpg',
      }),
    ).rejects.toThrow('image_too_large_after_compression');
  });

  it('measures the compressed Blob on web where expo-file-system is unavailable', async () => {
    (Platform as { OS: string }).OS = 'web';
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      blob: async () => ({ size: 530_000 }),
    } as Response);

    const out = await compressImageForUpload({
      uri: 'blob:original',
      width: 1200,
      height: 800,
      fileName: 'web.png',
      fileSize: 2_000_000,
    });

    expect(fetchSpy).toHaveBeenCalledWith('file:///compressed.jpg');
    expect(out.byteSize).toBe(530_000);
    fetchSpy.mockRestore();
  });
});
