import * as Clipboard from 'expo-clipboard';
import Share, { Social } from 'react-native-share';

// Facebook App ID is required by Instagram's Story share. Supply it via EAS
// env (EXPO_PUBLIC_FACEBOOK_APP_ID) after registering a Meta app; until then
// the Story share gracefully falls back to the generic share sheet.
const FB_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? '';

export type ShareResult = 'shared' | 'sheet' | 'failed';
export type StoryShareResult = 'story' | 'sheet' | 'failed';

export async function copyLink(url: string): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(url);
    return true;
  } catch {
    return false;
  }
}

// Generic OS share sheet — the universal fallback. Hands the branded card PNG
// (url) plus text (message, which already contains the link) to whatever app
// the user picks: WhatsApp, Telegram, Messages, Mail, Signal, X, AirDrop, …
export async function shareToSystemSheet(opts: {
  imageUri: string;
  message: string;
}): Promise<ShareResult> {
  try {
    await Share.open({ url: opts.imageUri, message: opts.message });
    return 'sheet';
  } catch {
    // user cancelled or no target picked — nothing worth surfacing
    return 'failed';
  }
}

// One-tap direct share to a specific app. shareSingle needs the native module
// (EAS build) and the target app installed; on failure (not installed / Expo
// Go / cancelled) we fall back to the OS share sheet so the card+link still go.
async function shareSingleOrSheet(
  social: Exclude<Social, Social.FacebookStories | Social.InstagramStories>,
  opts: { imageUri: string; message: string },
): Promise<ShareResult> {
  try {
    await Share.shareSingle({ social, url: opts.imageUri, message: opts.message });
    return 'shared';
  } catch {
    return shareToSystemSheet(opts);
  }
}

export function shareToWhatsApp(opts: { imageUri: string; message: string }) {
  return shareSingleOrSheet(Social.Whatsapp, opts);
}

export function shareToTelegram(opts: { imageUri: string; message: string }) {
  return shareSingleOrSheet(Social.Telegram, opts);
}

export async function shareToInstagramStory(opts: {
  imageUri: string;
  linkUrl: string;
  onLinkCopied?: () => void;
}): Promise<StoryShareResult> {
  const { imageUri, linkUrl, onLinkCopied } = opts;

  // Meta does not expose a clickable whole-sticker URL to non-partner apps, so
  // we copy the link for the user to drop in as an Instagram Link Sticker.
  // attributionURL below upgrades this automatically if Postervia gets partner status.
  if (await copyLink(linkUrl)) {
    onLinkCopied?.();
  }

  if (FB_APP_ID) {
    try {
      await Share.shareSingle({
        social: Social.InstagramStories,
        appId: FB_APP_ID,
        backgroundImage: imageUri,
        attributionURL: linkUrl,
      });
      return 'story';
    } catch {
      // Instagram not installed / cancelled / no partner perms → generic sheet
    }
  }

  const fallback = await shareToSystemSheet({ imageUri, message: linkUrl });
  return fallback === 'failed' ? 'failed' : 'sheet';
}
