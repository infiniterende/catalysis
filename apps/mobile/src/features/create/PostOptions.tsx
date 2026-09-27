import { suggestedVerses, verseLabel, type Audience, type VerseRef } from '@catalysis/api';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/Buttons';
import { Label } from '@/components/Label';
import { Sheet } from '@/components/Sheet';
import { Touchable } from '@/components/Touchable';
import { colors, display, onDark } from '@/theme';

const AUDIENCES: { key: Audience; label: string }[] = [
  { key: 'everyone', label: 'Everyone' },
  { key: 'parish', label: 'Parish' },
  { key: 'followers', label: 'Followers' },
];

interface PostOptionsProps {
  verse: VerseRef | null;
  onVerse: (verse: VerseRef | null) => void;
  shareToParish: boolean;
  onShareToParish: (on: boolean) => void;
  audience: Audience;
  onAudience: (audience: Audience) => void;
}

/** The dark sheet at the foot of Create Post: verse, parish and audience. */
export function PostOptions({ verse, onVerse, shareToParish, onShareToParish, audience, onAudience }: PostOptionsProps) {
  const insets = useSafeAreaInsets();
  const [choosing, setChoosing] = useState(false);
  const [verses, setVerses] = useState<VerseRef[]>([]);

  useEffect(() => {
    let live = true;
    void suggestedVerses().then((list) => {
      if (live) setVerses(list.map((v) => ({ ...v, label: verseLabel(v.bookId, v.chapter, v.verse) })));
    });
    return () => {
      live = false;
    };
  }, []);

  const current = AUDIENCES.find((item) => item.key === audience) ?? AUDIENCES[0];
  const next = AUDIENCES[(AUDIENCES.findIndex((item) => item.key === audience) + 1) % AUDIENCES.length];

  return (
    <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 18 }]}>
      <View style={styles.chips}>
        {verse ? (
          <Chip
            tone="dark"
            filled
            padV={9}
            label={`${verse.label} ×`}
            accessibilityLabel={`Remove ${verse.label}`}
            onPress={() => onVerse(null)}
          />
        ) : (
          <Chip tone="dark" padV={9} label="+ Add a verse" onPress={() => setChoosing(true)} />
        )}
        <Chip
          tone="dark"
          padV={9}
          label="Share to parish"
          filled={shareToParish}
          selected={shareToParish}
          onPress={() => onShareToParish(!shareToParish)}
        />
      </View>

      <Touchable
        hitSlop={undefined}
        onPress={() => next && onAudience(next.key)}
        accessibilityRole="button"
        accessibilityLabel={`Audience: ${current?.label}`}
        accessibilityHint={next ? `Changes to ${next.label}` : undefined}
        style={styles.audience}>
        <Label size={9} color={colors.onDarkMuted}>Audience</Label>
        <Label size={9} color={colors.white}>{current?.label} ›</Label>
      </Touchable>

      <Sheet visible={choosing} onClose={() => setChoosing(false)} title="Add a verse" tone="dark" scroll>
        {verses.map((option, i) => (
          <Touchable
            key={option.label}
            hitSlop={undefined}
            onPress={() => {
              onVerse(option);
              setChoosing(false);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${option.label}. ${option.text}`}
            style={styles.verse}>
            <Label size={8.5} color={colors.crimsonOnDark}>
              {i === 0 ? `Verse of the day · ${option.label}` : option.label}
            </Label>
            <Text style={styles.verseText}>{option.text}</Text>
          </Touchable>
        ))}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.sheet,
    borderTopWidth: 1,
    borderTopColor: onDark.ruleSheet,
    paddingTop: 18,
    paddingHorizontal: 20,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  audience: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: onDark.ruleSoft,
  },
  verse: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: onDark.ruleSoft },
  verseText: { ...display(18, { italic: true, lineHeight: 1.3 }), color: colors.paper, marginTop: 8 },
});
