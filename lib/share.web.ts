import * as Clipboard from 'expo-clipboard';

// Web build of lib/share.ts. react-native-share is a native module with no web
// build, so on web Metro resolves THIS file instead. Same exported surface as
// share.ts so callers (components/ShareSheet.tsx) are identical — but the image
// card can't travel through the browser share channels, so web shares the link/
// text only (Web Share API when available, else messenger web URLs, else copy).

export type ShareResult = 'shared' | 'sheet' | 'failed';
export type StoryShareResult = 'story' | 'sheet' | 'failed';

export async function copyLink(url: string): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(url);
    return true;
  } catch {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      return false;
    }
  }
}

function canWebShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export async function shareToSystemSheet(opts: {
  imageUri: string;
  message: string;
}): Promise<ShareResult> {
  if (canWebShare()) {
    try {
      await navigator.share({ text: opts.message });
      return 'sheet';
    } catch {
      // user cancelled or share unsupported for this payload
    }
  }
  return (await copyLink(opts.message)) ? 'sheet' : 'failed';
}

async function openMessengerShare(targetUrl: string, message: string): Promise<ShareResult> {
  if (canWebShare()) {
    try {
      await navigator.share({ text: message });
      return 'shared';
    } catch {
      // fall through to opening the messenger's web share URL
    }
  }
  try {
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
    return 'sheet';
  } catch {
    return (await copyLink(message)) ? 'sheet' : 'failed';
  }
}

export function shareToWhatsApp(opts: { imageUri: string; message: string }) {
  return openMessengerShare(`https://wa.me/?text=${encodeURIComponent(opts.message)}`, opts.message);
}

export function shareToTelegram(opts: { imageUri: string; message: string }) {
  return openMessengerShare(
    `https://t.me/share/url?url=${encodeURIComponent(opts.message)}`,
    opts.message,
  );
}

export async function shareToInstagramStory(opts: {
  imageUri: string;
  linkUrl: string;
  onLinkCopied?: () => void;
}): Promise<StoryShareResult> {
  // Instagram exposes no web Story-share API — copy the link as the fallback.
  if (await copyLink(opts.linkUrl)) opts.onLinkCopied?.();
  return 'sheet';
}
