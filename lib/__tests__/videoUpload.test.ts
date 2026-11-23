import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { api } from '../api';
import { uploadVideoDirect } from '../videoUpload';

const PART = 12 * 1024 * 1024;
const FILE_URI = 'file:///cache/compressed.mp4';

const mockHandle = {
  offset: null as number | null,
  readBytes: jest.fn(),
  close: jest.fn(),
};

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation(() => ({ open: () => mockHandle })),
}));

jest.mock('../api', () => ({ api: { post: jest.fn() } }));

const post = api.post as jest.Mock;
const fetchMock = jest.fn();
const originalFetch = global.fetch;

function partResponse(ok: boolean, etag: string) {
  return {
    ok,
    status: ok ? 200 : 500,
    headers: { get: (name: string) => (name.toLowerCase() === 'etag' ? `"${etag}"` : null) },
  };
}

function upload(sizeBytes: number, onProgress?: (fraction: number) => void) {
  return uploadVideoDirect({
    uri: FILE_URI,
    mimeType: 'video/mp4',
    sizeBytes,
    durationSeconds: 60,
    onProgress,
  });
}

describe('uploadVideoDirect', () => {
  beforeAll(() => {
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    (Platform as { OS: string }).OS = 'android';
    jest.spyOn(Math, 'random').mockReturnValue(0);
    fetchMock.mockReset();
    mockHandle.offset = null;
    mockHandle.readBytes.mockReset();
    mockHandle.close.mockReset();
    (File as unknown as jest.Mock).mockClear();
    post.mockReset();
    post.mockImplementation(async (path: string) => {
      if (path.endsWith('/initiate')) {
        return {
          data: {
            data: {
              key: 'community/videos/v.mp4',
              upload_id: 'upload-1',
              part_urls: ['https://r2.example/1', 'https://r2.example/2', 'https://r2.example/3'],
              media_url: 'https://media.example/community/videos/v.mp4',
            },
          },
        };
      }
      return { data: { data: { media_url: 'https://media.example/community/videos/v.mp4' } } };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reads each part from disk on native instead of loading the whole file', async () => {
    const reads: Array<{ offset: number | null; length: number; chunk: Uint8Array }> = [];
    mockHandle.readBytes.mockImplementation((length: number) => {
      const chunk = new Uint8Array(1);
      reads.push({ offset: mockHandle.offset, length, chunk });
      return chunk;
    });
    fetchMock.mockImplementation(async (url: string) =>
      partResponse(true, `etag-${url.slice(-1)}`),
    );
    const progress: number[] = [];

    const result = await upload(2 * PART + 6, (fraction) => progress.push(fraction));

    expect(File).toHaveBeenCalledWith(FILE_URI);
    expect(reads.map(({ offset, length }) => [offset, length])).toEqual([
      [0, PART],
      [PART, PART],
      [2 * PART, 6],
    ]);
    expect(fetchMock.mock.calls.map(([url, init]) => [url, init.method, init.body])).toEqual([
      ['https://r2.example/1', 'PUT', reads[0].chunk],
      ['https://r2.example/2', 'PUT', reads[1].chunk],
      ['https://r2.example/3', 'PUT', reads[2].chunk],
    ]);
    expect(mockHandle.close).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/community/media/video-upload/initiate', {
      mime_type: 'video/mp4',
      size_bytes: 2 * PART + 6,
      duration_seconds: 60,
      part_count: 3,
    });
    expect(post.mock.calls[1][1].parts).toEqual([
      { part_number: 1, etag: 'etag-1' },
      { part_number: 2, etag: 'etag-2' },
      { part_number: 3, etag: 'etag-3' },
    ]);
    expect(progress[progress.length - 1]).toBe(1);
    expect(result.media_url).toBe('https://media.example/community/videos/v.mp4');
  });

  it('slices the blob on web', async () => {
    (Platform as { OS: string }).OS = 'web';
    const slices: Array<[number, number]> = [];
    const blob = {
      slice: (start: number, end: number) => {
        slices.push([start, end]);
        return `slice-${start}`;
      },
    };
    fetchMock.mockImplementation(async (url: string, init?: { method?: string }) =>
      init?.method === 'PUT' ? partResponse(true, 'etag') : { blob: async () => blob },
    );

    await upload(PART + 10);

    expect(File).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(FILE_URI);
    expect(slices).toEqual([
      [0, PART],
      [PART, PART + 10],
    ]);
  });

  it('aborts the upload and closes the file when a part keeps failing', async () => {
    mockHandle.readBytes.mockImplementation(() => new Uint8Array(1));
    fetchMock.mockImplementation(async () => partResponse(false, 'etag'));

    await expect(upload(PART)).rejects.toThrow('part upload failed: 500');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(post).toHaveBeenCalledWith('/community/media/video-upload/abort', {
      key: 'community/videos/v.mp4',
      upload_id: 'upload-1',
    });
    expect(mockHandle.close).toHaveBeenCalledTimes(1);
  });
});
