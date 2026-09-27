import type { Prayer } from '@catalysis/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Daily local notifications, one per prayer at its scheduled time.
 * The on/off choice is kept beside the app store because the shared store has no field for it.
 */
const PREFERENCE_KEY = 'catalysis.reminders';
const ID_PREFIX = 'prayer-';
const CHANNEL_ID = 'prayers';

export type ReminderResult = 'on' | 'off' | 'denied' | 'unavailable';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

if (supported) {
  // Show the reminder even if the app is open when it fires.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function remindersEnabled(): Promise<boolean> {
  if (!supported) return false;
  try {
    return (await AsyncStorage.getItem(PREFERENCE_KEY)) === 'on';
  } catch {
    return false;
  }
}

async function cancelAll(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((request) => request.identifier.startsWith(ID_PREFIX))
      .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)),
  );
}

async function scheduleAll(prayers: Prayer[]): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Prayer reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  await cancelAll();
  for (const prayer of prayers) {
    const [hour = 0, minute = 0] = prayer.scheduledTime.split(':').map(Number);
    await Notifications.scheduleNotificationAsync({
      identifier: `${ID_PREFIX}${prayer.id}`,
      content: { title: prayer.title, body: 'It is time to pray.' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL_ID },
    });
  }
}

/** Asks for permission if needed, then schedules a reminder for every prayer. */
export async function turnRemindersOn(prayers: Prayer[]): Promise<ReminderResult> {
  if (!supported) return 'unavailable';
  try {
    let permission = await Notifications.getPermissionsAsync();
    if (!permission.granted && permission.canAskAgain) {
      permission = await Notifications.requestPermissionsAsync();
    }
    if (!permission.granted) return 'denied';
    await scheduleAll(prayers);
    await AsyncStorage.setItem(PREFERENCE_KEY, 'on');
    return 'on';
  } catch {
    return 'unavailable';
  }
}

export async function turnRemindersOff(): Promise<ReminderResult> {
  if (!supported) return 'unavailable';
  try {
    await cancelAll();
    await AsyncStorage.setItem(PREFERENCE_KEY, 'off');
    return 'off';
  } catch {
    return 'unavailable';
  }
}

/** Reschedules after the rule changes. Does nothing unless reminders are on and still permitted. */
export async function syncReminders(prayers: Prayer[]): Promise<void> {
  if (!supported || !(await remindersEnabled())) return;
  try {
    const permission = await Notifications.getPermissionsAsync();
    if (permission.granted) await scheduleAll(prayers);
  } catch {
    // Reminders are a convenience; a scheduling failure must not interrupt prayer.
  }
}
