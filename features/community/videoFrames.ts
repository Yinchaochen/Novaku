import * as VideoThumbnails from 'expo-video-thumbnails';

export interface VideoFrame {
  uri: string;
  width: number;
  height: number;
}

export interface VideoFrameSource {
  capture(timeMs: number): Promise<VideoFrame>;
  close(): void;
}

// iOS / Android: expo-video-thumbnails reads frames straight from the file.
// The web build resolves videoFrames.web.ts instead, because this module only
// throws there.
export async function openVideoFrameSource(uri: string): Promise<VideoFrameSource> {
  return {
    async capture(timeMs) {
      const thumbnail = await VideoThumbnails.getThumbnailAsync(uri, { time: timeMs, quality: 0.6 });
      return { uri: thumbnail.uri, width: thumbnail.width, height: thumbnail.height };
    },
    close() {},
  };
}
