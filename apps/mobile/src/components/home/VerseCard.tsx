import { StyleSheet, Text, View } from 'react-native';

import { Card, Pill } from '@/components/ui';
import { caps, display, radii, useStyles, type ThemeColors } from '@/theme';

export interface VerseCardProps {
  text: string;
  /** "John 1:5 · NABRE" */
  reference: string;
  /** Opens the chapter in the reader. */
  onReflect: () => void;
  onShare: () => void;
}

/** Verse of the day, on `solid`. */
export function VerseCard({ text, reference, onReflect, onShare }: VerseCardProps) {
  const styles = useStyles(themed);
  return (
    <Card surface="solid" radius={radii.card} padding={22}>
      <View style={styles.labels}>
        <Text style={styles.label}>Verse of the day</Text>
        <Text style={styles.reference}>{reference}</Text>
      </View>
      <Text style={styles.verse}>{text}</Text>
      <View style={styles.actions}>
        <Pill
          label="Reflect"
          variant="highlight"
          onPress={onReflect}
          accessibilityHint="Opens the chapter in the Bible"
        />
        <Pill
          label="Share"
          variant="onSolid"
          icon="share-2"
          padH={17}
          onPress={onShare}
          accessibilityLabel="Share the verse of the day"
        />
      </View>
    </Card>
  );
}

const themed = (c: ThemeColors) =>
  StyleSheet.create({
    labels: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    label: { ...caps(11), color: c.a2 },
    reference: { ...caps(11), color: c.onSolidDim },
    verse: { ...display(27, 'medium', { lineHeight: 1.12, tracking: -0.02 }), color: c.white, marginTop: 12 },
    actions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  });
