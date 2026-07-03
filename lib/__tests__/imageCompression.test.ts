import * as ImageManipulator from 'expo-image-manipulator';

import { compressImageForUpload } from '../imageCompression';

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));

const manipulateAsync = ImageManipulator.manipulateAsync as jest.Mock;

describe('compressImageForUpload', () => {
  beforeEach(() => {
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
    });
    expect(out).toEqual({
      uri: 'file:///compressed.jpg',
      mimeType: 'image/jpeg',
      fileName: 'holiday photo.jpg',
    });
  });

  it('falls back to the original uri when manipulation throws', async () => {
    manipulateAsync.mockRejectedValue(new Error('native failure'));
    const out = await compressImageForUpload({
      uri: 'file:///original.jpg',
      width: 4000,
      height: 3000,
      fileName: 'orig.jpg',
    });
    expect(out).toEqual({
      uri: 'file:///original.jpg',
      mimeType: 'image/jpeg',
      fileName: 'orig.jpg',
    });
  });
});
