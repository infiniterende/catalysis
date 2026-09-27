import { parseISODate, type CalendarEvent } from '@catalysis/api';
import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

export type AddToCalendarResult = 'added' | 'denied' | 'unavailable';

const ONE_HOUR = 60 * 60 * 1000;

function startOf(event: CalendarEvent): Date {
  const day = parseISODate(event.date);
  const [hour = 0, minute = 0] = event.time.split(':').map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute);
}

/** iOS has a default calendar; Android has none, so the first writable one is used, primary first. */
async function writableCalendar(): Promise<Calendar.ExpoCalendar | undefined> {
  if (Platform.OS === 'ios') return Calendar.getDefaultCalendarSync();
  const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  const writable = calendars.filter((calendar) => calendar.allowsModifications);
  return writable.find((calendar) => calendar.isPrimary) ?? writable[0];
}

/** Adds the event to the device calendar. Events are taken to last one hour. */
export async function addToCalendar(event: CalendarEvent): Promise<AddToCalendarResult> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return 'unavailable';
  try {
    // Write-only access is all that is needed, and all that app.json asks for on iOS.
    const permission = await Calendar.requestCalendarPermissions(true);
    if (!permission.granted) return 'denied';

    const calendar = await writableCalendar();
    if (!calendar) return 'unavailable';

    const startDate = startOf(event);
    await calendar.createEvent({
      title: event.title,
      location: event.location,
      startDate,
      endDate: new Date(startDate.getTime() + ONE_HOUR),
    });
    return 'added';
  } catch {
    return 'unavailable';
  }
}
