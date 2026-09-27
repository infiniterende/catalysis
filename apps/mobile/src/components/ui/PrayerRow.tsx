import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { body, radii, useStyles, useTheme, type ThemeColors } from '@/theme';

import { Icon } from './Icon';
import { Pill } from './Pill';
import { Touchable } from './Touchable';

export interface PrayerRowProps {
  title: string;
  /** Prayed: `btn` check, title struck through in `subtle`. */
  done: boolean;
  /** The first prayer still to pray today: bold title, `ink` ring, `a1` pill. */
  next?: boolean;
  /** Right-hand text: when it was prayed or is due ("7:14", "9 PM"). On the next row it is set in the `a1` pill. */
  meta?: string;
  /** A real button at the right in place of `meta`, e.g. "Start" opening the guided prayer. */
  action?: { label: string; onPress: () => void; accessibilityLabel?: string };
  /** Draws the 2px `ink` outline around the next row, as on the Prayer screen. Home leaves it off. */
  outlined?: boolean;
  /** The tighter row used inside a card (Home). */
  compact?: boolean;
  /** Toggles the prayer. */
  onPress: () => void;
  onLongPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

/** One prayer of today's rule. The row is the checkbox; `action`, if any, is a button beside it. */
export function PrayerRow({
  title, done, next = false, meta, action, outlined = false, compact = false, onPress, onLongPress,
  accessibilityLabel, accessibilityHint, style,
}: PrayerRowProps) {
  const { colors } = useTheme();
  const styles = useStyles(themed);
  const mark = compact ? 24 : 26;

  return (
    <View style={[styles.row, compact && styles.compact, next && outlined && styles.ringed, style]}>
      <Touchable
        onPress={onPress}
        onLongPress={onLongPress}
        hitSlop={{ top: 10, bottom: 10, left: 12 }}
        pressedOpacity={0.7}
        accessibilityRole="checkbox"
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityHint={accessibilityHint ?? (done ? 'Marks it as not prayed' : 'Marks it as prayed')}
        accessibilityState={{ checked: done }}
        style={styles.check}>
        <View
          style={[
            styles.mark,
            { width: mark, height: mark, borderRadius: mark / 2 },
            done ? styles.markDone : next ? styles.markNext : styles.markOpen,
          ]}>
          {done ? <Icon name="check" size={14} color={colors.btnText} strokeWidth={2.5} /> : null}
        </View>
        <Text numberOfLines={1} style={[styles.title, done && styles.titleDone, next && styles.titleNext]}>
          {title}
        </Text>
        {meta && !action ? (
          next ? (
            <View style={styles.pill}>
              <Text style={styles.pillText}>{meta}</Text>
            </View>
          ) : (
            <Text style={[styles.meta, !done && styles.metaOpen]}>{meta}</Text>
          )
        ) : null}
      </Touchable>
      {action ? (
        <Pill
          label={action.label}
          variant="accent"
          size="sm"
          padV={6}
          padH={13}
          onPress={action.onPress}
          accessibilityLabel={action.accessibilityLabel}
        />
      ) : null}
    </View>
  );
}

const themed = (c: ThemeColors) =>
  StyleSheet.create({
    // The 2px border is always there, so the row keeps its size when it becomes "next".
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.inset,
      borderRadius: radii.input,
      borderWidth: 2,
      borderColor: c.inset,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    compact: { borderRadius: 16, paddingVertical: 9, paddingHorizontal: 10 },
    ringed: { backgroundColor: 'transparent', borderColor: c.ink },
    check: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 28 },
    mark: { alignItems: 'center', justifyContent: 'center' },
    markDone: { backgroundColor: c.btn },
    markNext: { borderWidth: 2, borderColor: c.ink },
    markOpen: { borderWidth: 2, borderColor: c.faint },
    title: { ...body(15, 'regular', { lineHeight: 1.3 }), color: c.ink, flex: 1 },
    titleNext: { ...body(15, 'semibold', { lineHeight: 1.3 }) },
    titleDone: { color: c.subtle, textDecorationLine: 'line-through' },
    meta: { ...body(13), color: c.subtle },
    metaOpen: { color: c.muted },
    pill: { backgroundColor: c.a1, borderRadius: radii.pill, paddingVertical: 6, paddingHorizontal: 13 },
    pillText: { ...body(13, 'bold', { lineHeight: 1.3 }), color: c.onA },
  });
