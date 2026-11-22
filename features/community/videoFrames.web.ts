import type { VideoFrame, VideoFrameSource } from './videoFrames';

export type { VideoFrame, VideoFrameSource } from './videoFrames';

const FRAME_LONG_EDGE = 960;

function waitFor(video: HTMLVideoElement, event: 'loadeddata' | 'seeked'): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = () => {
      cleanup();
      resolve();
    };
    const fail = () => {
      cleanup();
      reject(new Error('video_frame_failed'));
    };
    const cleanup = () => {
      video.removeEventListener(event, done);
      video.removeEventListener('error', fail);
    };
    video.addEventListener(event, done);
    video.addEventListener('error', fail);
  });
}

// expo-video-thumbnails has no web implementation, so the browser seeks a
// hidden <video> and draws each frame onto a canvas.
export async function openVideoFrameSource(uri: string): Promise<VideoFrameSource> {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  const loaded = waitFor(video, 'loadeddata');
  video.src = uri;
  await loaded;
  const canvas = document.createElement('canvas');

  return {
    async capture(timeMs) {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const seconds = Math.min(Math.max(0, timeMs / 1000), Math.max(0, duration - 0.05));
      const seeked = waitFor(video, 'seeked');
      video.currentTime = seconds;
      await seeked;

      const scale = Math.min(1, FRAME_LONG_EDGE / Math.max(video.videoWidth, video.videoHeight, 1));
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('video_frame_failed');
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((result) => (result ? resolve(result) : reject(new Error('video_frame_failed'))), 'image/jpeg', 0.7),
      );
      return { uri: URL.createObjectURL(blob), width: canvas.width, height: canvas.height };
    },
    close() {
      video.removeAttribute('src');
      video.load();
    },
  };
}
