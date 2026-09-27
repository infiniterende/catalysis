import { pad2, REEL_MAX_SECONDS } from '@catalysis/api';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';

import { OutlineButton } from '@/components/Buttons';
import { Icon } from '@/components/Icon';
import { Label } from '@/components/Label';
import { Placeholder } from '@/components/Photo';
import { IconButton, Touchable } from '@/components/Touchable';
import { ReelVideo } from '@/features/reels/ReelVideo';
import { colors, display, onDark, text } from '@/theme';

export interface Captured {
  kind: 'image' | 'video';
  uri: string;
}

interface CameraStageProps {
  mode: 'photo' | 'reel';
  captured: Captured | null;
  onCapture: (media: Captured | null) => void;
  /** Brief message over the preview, e.g. "Coming soon". */
  onToast: (message: string) => void;
}

const TIMERS = [0, 3, 10] as const;
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${pad2(seconds % 60)}`;

/**
 * Camera preview with capture controls; shows the captured media once there is some.
 * The parent keys this by mode, so switching between Photo and Reel starts it afresh.
 */
export function CameraStage({ mode, captured, onCapture, onToast }: CameraStageProps) {
  const camera = useRef<CameraView>(null);
  const [cameraPermission, requestCamera] = useCameraPermissions();
  const [microphonePermission, requestMicrophone] = useMicrophonePermissions();

  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [flash, setFlash] = useState(false);
  const [timer, setTimer] = useState<(typeof TIMERS)[number]>(0);
  const [countdown, setCountdown] = useState(0);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [ready, setReady] = useState(false);

  const reel = mode === 'reel';
  const allowed = Boolean(cameraPermission?.granted) && (!reel || Boolean(microphonePermission?.granted));
  const blocked =
    (cameraPermission && !cameraPermission.granted && !cameraPermission.canAskAgain) ||
    (reel && microphonePermission && !microphonePermission.granted && !microphonePermission.canAskAgain);

  // Ticks the "0:07 / 1:00" counter while a reel is being recorded.
  useEffect(() => {
    if (!recording) return undefined;
    const startedAt = Date.now();
    const tick = setInterval(
      () => setElapsed(Math.min(REEL_MAX_SECONDS, Math.floor((Date.now() - startedAt) / 1000))),
      250,
    );
    return () => clearInterval(tick);
  }, [recording]);

  // The self-timer's interval, cleared if the screen closes mid-countdown.
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopCountdown = () => {
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    countdownTimer.current = null;
    setCountdown(0);
  };
  useEffect(() => () => {
    if (countdownTimer.current) clearInterval(countdownTimer.current);
  }, []);

  const allow = async () => {
    if (blocked) {
      await Linking.openSettings().catch(() => undefined);
      return;
    }
    const cameraResult = cameraPermission?.granted ? cameraPermission : await requestCamera();
    if (cameraResult.granted && reel && !microphonePermission?.granted) await requestMicrophone();
  };

  const capture = async () => {
    const view = camera.current;
    if (!view || !ready) return;
    try {
      if (!reel) {
        const picture = await view.takePictureAsync({ quality: 0.85 });
        onCapture({ kind: 'image', uri: picture.uri });
        return;
      }
      if (Platform.OS === 'web') {
        onToast('Recording is not available in the browser');
        return;
      }
      setElapsed(0);
      setRecording(true);
      // Resolves when recording is stopped or reaches the limit.
      const video = await view.recordAsync({ maxDuration: REEL_MAX_SECONDS });
      if (video?.uri) onCapture({ kind: 'video', uri: video.uri });
    } catch {
      onToast(reel ? 'Could not record' : 'Could not take the photo');
    } finally {
      setRecording(false);
    }
  };

  const pressRecord = () => {
    if (recording) {
      camera.current?.stopRecording();
      return;
    }
    if (countdownTimer.current) {
      stopCountdown();
      return;
    }
    if (timer === 0) {
      void capture();
      return;
    }
    let remaining: number = timer;
    setCountdown(remaining);
    countdownTimer.current = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setCountdown(remaining);
        return;
      }
      stopCountdown();
      void capture();
    }, 1000);
  };

  const pick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: reel ? ['videos'] : ['images'],
        videoMaxDuration: REEL_MAX_SECONDS,
        quality: 0.85,
      });
      const asset = result.canceled ? undefined : result.assets[0];
      if (!asset) return;
      if (reel && (asset.duration ?? 0) > REEL_MAX_SECONDS * 1000) {
        onToast(`Reels can be at most ${REEL_MAX_SECONDS} seconds`);
        return;
      }
      onCapture({ kind: reel ? 'video' : 'image', uri: asset.uri });
    } catch {
      onToast('Your library could not be opened');
    }
  };

  if (captured) {
    return (
      <View style={styles.stage}>
        {captured.kind === 'video'
          ? <ReelVideo uri={captured.uri} active muted />
          : <Image source={{ uri: captured.uri }} contentFit="cover" style={StyleSheet.absoluteFill} />}
        <Touchable
          onPress={() => onCapture(null)}
          accessibilityRole="button"
          accessibilityLabel="Retake"
          style={styles.retake}>
          <Label size={9} color={colors.white}>Retake</Label>
        </Touchable>
      </View>
    );
  }

  return (
    <View style={styles.stage}>
      {allowed ? (
        <CameraView
          ref={camera}
          style={StyleSheet.absoluteFill}
          facing={facing}
          mode={reel ? 'video' : 'picture'}
          flash={!reel && flash ? 'on' : 'off'}
          enableTorch={reel && flash}
          onCameraReady={() => setReady(true)}
          onMountError={() => onToast('The camera could not be started')}
        />
      ) : (
        <Placeholder style={StyleSheet.absoluteFill}>
          <View style={styles.permission}>
            <Text style={styles.permissionText}>
              {blocked
                ? 'Camera access is turned off for Catalysis. You can allow it in Settings.'
                : reel
                  ? 'Allow the camera and microphone to record a reel, or choose a video from your library.'
                  : 'Allow the camera to take a photo, or choose one from your library.'}
            </Text>
            <OutlineButton
              tone="dark"
              label={blocked ? 'Open Settings' : 'Allow camera'}
              padV={13}
              size={10}
              onPress={() => void allow()}
            />
          </View>
        </Placeholder>
      )}

      {reel ? (
        <Label size={9} color={colors.white} style={styles.counter} accessibilityLiveRegion="none">
          {clock(elapsed)} / {clock(REEL_MAX_SECONDS)}
        </Label>
      ) : null}

      <View style={styles.tools}>
        <IconButton
          name={flash ? 'zap' : 'zap-off'}
          size={20}
          color={colors.white}
          label={flash ? 'Turn flash off' : 'Turn flash on'}
          selected={flash}
          onPress={() => setFlash((on) => !on)}
        />
        <IconButton
          name="switch-camera"
          size={20}
          color={colors.white}
          label="Flip camera"
          onPress={() => setFacing((side) => (side === 'back' ? 'front' : 'back'))}
        />
        <View style={styles.tool}>
          <IconButton
            name="timer"
            size={20}
            color={colors.white}
            label={timer ? `Self-timer, ${timer} seconds` : 'Self-timer, off'}
            onPress={() => setTimer((value) => TIMERS[(TIMERS.indexOf(value) + 1) % TIMERS.length] ?? 0)}
          />
          <Label size={7.5} em={0.1} color={colors.white} style={styles.toolLabel}>
            {timer ? `${timer}s` : 'Off'}
          </Label>
        </View>
        <IconButton
          name="music"
          size={20}
          color={colors.white}
          label="Add music"
          onPress={() => onToast('Coming soon')}
        />
      </View>

      {countdown > 0 ? (
        <View pointerEvents="none" style={styles.countdown}>
          <Text style={styles.countdownText}>{countdown}</Text>
        </View>
      ) : null}

      <View style={styles.controls}>
        <Touchable
          onPress={() => void pick()}
          accessibilityRole="button"
          accessibilityLabel={reel ? 'Choose a video from your library' : 'Choose a photo from your library'}>
          <Placeholder style={styles.gallery} />
        </Touchable>

        <Touchable
          hitSlop={undefined}
          pressedOpacity={0.85}
          onPress={pressRecord}
          disabled={!allowed}
          accessibilityRole="button"
          accessibilityLabel={reel ? (recording ? 'Stop recording' : 'Record') : 'Take photo'}
          accessibilityState={{ disabled: !allowed, busy: recording }}
          style={[styles.ring, !allowed && styles.ringDisabled]}>
          <View style={recording ? styles.stop : styles.disc} />
        </Touchable>

        <Touchable
          onPress={() => void pick()}
          accessibilityRole="button"
          accessibilityLabel="Upload from your library"
          style={styles.upload}>
          <Icon name="upload" size={19} color={colors.white} />
        </Touchable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 440pt in the design; it gives up height on shorter phones rather than pushing the options off screen.
  stage: { flex: 1, minHeight: 300, backgroundColor: colors.black, overflow: 'hidden' },
  permission: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, paddingHorizontal: 44, paddingBottom: 96 },
  permissionText: { ...text(15, { italic: true, lineHeight: 1.5 }), color: colors.onDarkBody, textAlign: 'center' },
  counter: { position: 'absolute', top: 18, left: 18 },
  retake: {
    position: 'absolute',
    top: 14,
    left: 14,
    paddingVertical: 8,
    paddingHorizontal: 11,
    backgroundColor: 'rgba(11,11,11,0.6)',
  },
  tools: { position: 'absolute', top: 18, right: 16, alignItems: 'center', gap: 20 },
  tool: { alignItems: 'center' },
  toolLabel: { marginTop: 3 },
  countdown: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  countdownText: { ...display(120), color: colors.white },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
  },
  gallery: { width: 44, height: 44, borderWidth: 1.5, borderColor: colors.white },
  // The one place the design is not square: the record button and its ring.
  ring: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringDisabled: { opacity: 0.5 },
  disc: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.crimson },
  stop: { width: 30, height: 30, borderRadius: 6, backgroundColor: colors.crimson },
  upload: {
    width: 44,
    height: 44,
    borderWidth: 1.5,
    borderColor: onDark.outlineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
