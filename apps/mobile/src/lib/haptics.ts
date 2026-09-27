import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

/** A light tap, for toggles and selections. Does nothing on web. */
export function tapHaptic(): void {
  if (!supported) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** The "done" pattern, for a prayer marked as prayed. Does nothing on web. */
export function successHaptic(): void {
  if (!supported) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
