import { useVideoPlayer, VideoView, type VideoPlayer } from 'expo-video';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';

interface ReelVideoProps {
  uri: string;
  /** True while this reel is the visible page of a focused screen. */
  active: boolean;
  muted: boolean;
}

/**
 * The player is a native object driven by assignment, not React state. Doing
 * that here, outside the component, keeps it clear of the compiler's rule
 * against mutating values that come from hooks.
 */
function drive(player: VideoPlayer, { active, muted }: { active: boolean; muted: boolean }): void {
  player.muted = muted;
  if (active) player.play();
  else player.pause();
}

/** Looping, chromeless video that plays only while it is on screen. */
export function ReelVideo({ uri, active, muted }: ReelVideoProps) {
  const player = useVideoPlayer(uri, (created) => {
    created.loop = true;
    created.muted = true;
  });

  useEffect(() => {
    drive(player, { active, muted });
  }, [player, active, muted]);

  return (
    <VideoView
      player={player}
      nativeControls={false}
      contentFit="cover"
      allowsPictureInPicture={false}
      playsInline
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    />
  );
}
