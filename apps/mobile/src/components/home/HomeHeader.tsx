import { StyleSheet, Text, View } from 'react-native';

import { Avatar, IconButton, Touchable } from '@/components/ui';
import { body, display, layout, useStyles, type ThemeColors } from '@/theme';

export interface HomeHeaderProps {
  /** The user's full name; the avatar shows its first letter. */
  name: string;
  /** "Morning, Maria" */
  greeting: string;
  /** "Sat, Sept 26 · Sts. Cosmas & Damian" */
  dateLine: string;
  onOpenProfile: () => void;
  onOpenCalendar: () => void;
  onOpenLumen: () => void;
  onOpenNotifications: () => void;
}

/** Home's top row: avatar, date and greeting, Lumen and notifications. */
export function HomeHeader({
  name, greeting, dateLine, onOpenProfile, onOpenCalendar, onOpenLumen, onOpenNotifications,
}: HomeHeaderProps) {
  const styles = useStyles(themed);
  return (
    <View style={styles.header}>
      <Touchable
        onPress={onOpenProfile}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel="Your profile"
        accessibilityHint="Opens your profile">
        <Avatar name={name} tone="a3" letters={1} accessible={false} />
      </Touchable>

      <View style={styles.titles}>
        <Touchable
          onPress={onOpenCalendar}
          hitSlop={{ top: 12, bottom: 4 }}
          accessibilityRole="link"
          accessibilityLabel={dateLine}
          accessibilityHint="Opens the calendar">
          <Text numberOfLines={1} style={styles.date}>{dateLine}</Text>
        </Touchable>
        <Text accessibilityRole="header" numberOfLines={1} style={styles.greeting}>{greeting}</Text>
      </View>

      <IconButton name="sparkles" label="Ask Lumen" variant="accent" onPress={onOpenLumen} />
      <IconButton name="bell" label="Notifications" onPress={onOpenNotifications} />
    </View>
  );
}

const themed = (c: ThemeColors) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingTop: 8,
      paddingHorizontal: layout.screen,
    },
    titles: { flex: 1 },
    date: { ...body(13), color: c.muted },
    greeting: { ...display(24, 'bold', { lineHeight: 1.1, tracking: -0.03 }), color: c.ink },
  });
