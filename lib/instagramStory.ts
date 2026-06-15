import * as Clipboard from 'expo-clipboard';
import Share, { Social } from 'react-native-share';

// Facebook App ID is required by Instagram's Story share. Supply it via EAS
// env (EXPO_PUBLIC_FACEBOOK_APP_ID) after registering a Meta app; until then
// the share gracefully falls back to the generic share sheet.
const FB_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? '';

export type StoryShareResult = 'story' | 'sheet' | 'failed';

export async function shareToInstagramStory(opts: {
  imageUri: string;
  linkUrl: string;
  onLinkCopied?: () => void;
}): Promise<StoryShareResult> {
  const { imageUri, linkUrl, onLinkCopied } = opts;

  // Meta does not expose a clickable whole-sticker URL to non-partner apps, so
  // we copy the link for the user to drop in as an Instagram Link Sticker.
  // attributionURL below upgrades this automatically if Postervia gets partner status.
  try {
    await Clipboard.setStringAsync(linkUrl);
    onLinkCopied?.();
  } catch {
    // clipboard is best-effort
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

  try {
    await Share.open({ url: imageUri, message: linkUrl });
    return 'sheet';
  } catch {
    return 'failed';
  }
}
