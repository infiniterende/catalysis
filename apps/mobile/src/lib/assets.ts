import type { AssetKey, Media } from '@catalysis/api';
import type { ImageContentPosition, ImageSource } from 'expo-image';

const ASSETS: Record<AssetKey, number> = {
  angel: require('../../assets/images/angel.webp'),
  stJoseph: require('../../assets/images/st-joseph.webp'),
  rosary: require('../../assets/images/rosary.jpg'),
  monstrance: require('../../assets/images/monstrance.jpg'),
};

export function assetSource(key: AssetKey): number {
  return ASSETS[key];
}

/** Image to show for a piece of media: the bundled asset, else the remote or local URL. */
export function mediaSource(media: Media | undefined): ImageSource | number | undefined {
  if (!media) return undefined;
  if (media.asset) return ASSETS[media.asset];
  if (media.url) return { uri: media.url };
  return undefined;
}

/** `"50% 20%"` (CSS background-position) → expo-image `contentPosition`. */
export function focusToPosition(focus: string | undefined): ImageContentPosition {
  if (!focus) return 'center';
  const [x, y] = focus.trim().split(/\s+/);
  const percent = /^-?\d+(\.\d+)?%$/;
  if (!x || !percent.test(x)) return 'center';
  return {
    left: x as `${number}%`,
    top: (y && percent.test(y) ? y : '50%') as `${number}%`,
  };
}
