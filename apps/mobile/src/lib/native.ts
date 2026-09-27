import * as Clipboard from 'expo-clipboard';
import { Alert, Platform, Share } from 'react-native';

/**
 * Opens the system share sheet. On web, where there may be no share sheet,
 * the text is copied instead. Returns what happened so callers can say so.
 */
export async function shareText(message: string): Promise<'shared' | 'copied' | 'dismissed'> {
  try {
    const result = await Share.share({ message });
    return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
  } catch {
    try {
      await Clipboard.setStringAsync(message);
      return 'copied';
    } catch {
      return 'dismissed';
    }
  }
}

export async function copyText(message: string): Promise<boolean> {
  try {
    return await Clipboard.setStringAsync(message);
  } catch {
    return false;
  }
}

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel: string;
  destructive?: boolean;
}

/** `Alert.alert` is a no-op on react-native-web, so the browser's own dialog stands in there. */
export function confirm({ title, message, confirmLabel, destructive }: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    const ask = (globalThis as { confirm?: (text: string) => boolean }).confirm;
    return Promise.resolve(ask ? ask(message ? `${title}\n\n${message}` : title) : true);
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    const tell = (globalThis as { alert?: (text: string) => void }).alert;
    tell?.(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}
