import { verseRuns, type Highlight, type Verse } from '@catalysis/api';
import { useState } from 'react';
import {
  Platform, StyleSheet, Text, View, type NativeSyntheticEvent, type TextLayoutEventData, type TextStyle,
} from 'react-native';

import { colors, displayFamily, fonts, label } from '@/theme';

const BASE_SIZE = 17.5;
const BASE_LEADING = 1.78;
const CAP_SIZE = 74;
const CAP_GAP = 10;
/** Enough text to fill the lines beside the drop cap at any supported size. */
const MEASURE_CHARS = 600;

interface Run {
  key: string;
  verse: number;
  kind: 'number' | 'text';
  text: string;
  highlighted: boolean;
}

/** A paragraph of the chapter, with the section headings that stand over it. */
interface Block {
  key: string;
  headings: string[];
  runs: Run[];
}

interface PassageProps {
  verses: Verse[];
  /** Highlights for this chapter. */
  highlights: Highlight[];
  selectedVerse: number | null;
  onSelectVerse: (verse: number | null) => void;
  /** `reader.scale` and `reader.spacing` from the store. */
  scale: number;
  spacing: number;
}

/**
 * The chapter as flowing paragraphs, the first with a drop cap. A new paragraph
 * begins wherever the text has a section heading.
 *
 * React Native cannot float, so on iOS and Android the paragraph is set in two
 * pieces: the lines that sit beside the cap, then the rest at full width. Where
 * the first piece ends is measured from a hidden copy of the text. Until that
 * measurement arrives (or if it cannot be trusted) the first verse alone sits
 * beside the cap. The web build uses a real CSS float.
 */
export function Passage({ verses, highlights, selectedVerse, onSelectVerse, scale, spacing }: PassageProps) {
  const fontSize = BASE_SIZE * scale;
  const lineHeight = Math.round(fontSize * BASE_LEADING * spacing);
  const capSize = Math.round(CAP_SIZE * scale);
  // The design's cap box is 0.82 of its size plus a 6px top margin.
  const linesBesideCap = Math.max(2, Math.ceil((capSize * 0.82 + 6) / lineHeight));

  const { cap, blocks } = buildBlocks(verses, highlights);
  const [opening, ...rest] = blocks;
  const runs = opening?.runs ?? [];
  const flow = runs.map((run) => run.text).join('');
  const layoutKey = `${flow.slice(0, MEASURE_CHARS)}|${fontSize}|${linesBesideCap}`;
  const [measured, setMeasured] = useState<{ key: string; offset: number | null } | null>(null);

  const body: TextStyle = { fontFamily: fonts.text, fontSize, lineHeight, color: colors.body };
  const capStyle: TextStyle = { fontSize: capSize, lineHeight: capSize, marginTop: 6 - capSize * 0.09 };

  const renderRuns = (list: Run[], interactive = true) =>
    list.map((run) => {
      const selected = run.verse === selectedVerse;
      const press = interactive ? () => onSelectVerse(selected ? null : run.verse) : undefined;
      if (run.kind === 'number') {
        return (
          <Text key={run.key} onPress={press} style={[styles.number, selected && styles.selected]}>
            {run.text}
          </Text>
        );
      }
      return (
        <Text
          key={run.key}
          onPress={press}
          style={[run.highlighted && styles.highlighted, selected && !run.highlighted && styles.selected]}>
          {run.text}
        </Text>
      );
    });

  if (verses.length === 0 || !opening) return null;

  const renderHeadings = (headings: string[], first = false) =>
    headings.length === 0 ? null : (
      <View accessibilityRole="header" style={first ? styles.headingsFirst : styles.headings}>
        {headings.map((heading, i) => (
          <Text key={i} style={[styles.heading, headings.length > 1 && i < headings.length - 1 && styles.division]}>
            {heading}
          </Text>
        ))}
      </View>
    );

  const following = rest.map((block) => (
    <View key={block.key}>
      {renderHeadings(block.headings)}
      {block.runs.length > 0 ? <Text style={body}>{renderRuns(block.runs)}</Text> : null}
    </View>
  ));

  if (Platform.OS === 'web') {
    return (
      <View>
        {renderHeadings(opening.headings, true)}
        <Text style={body}>
          <Text style={[styles.cap, floatedCap(capSize)]}>{cap}</Text>
          {renderRuns(runs)}
        </Text>
        {following}
      </View>
    );
  }

  const onMeasure = (event: NativeSyntheticEvent<TextLayoutEventData>) => {
    const lines = event.nativeEvent.lines;
    const offset = lines.length <= linesBesideCap
      ? flow.length
      : offsetAfterLines(flow, lines.slice(0, linesBesideCap).map((line) => line.text));
    setMeasured((previous) =>
      previous?.key === layoutKey && previous.offset === offset ? previous : { key: layoutKey, offset });
  };

  const split = measured?.key === layoutKey ? measured.offset : null;
  // Fallback: the first verse beside the cap, everything else below it.
  const firstVerse = verses[0]?.number;
  const fallbackAt = runs.findIndex((run) => run.verse !== firstVerse);
  const head = split === null ? (fallbackAt < 0 ? runs : runs.slice(0, fallbackAt)) : sliceRuns(runs, 0, split);
  const tail = split === null ? (fallbackAt < 0 ? [] : runs.slice(fallbackAt)) : sliceRuns(runs, split, flow.length);

  return (
    <View>
      {renderHeadings(opening.headings, true)}
      <View style={styles.capRow}>
        <Text style={[styles.cap, capStyle, { marginRight: CAP_GAP }]}>{cap}</Text>
        <View style={styles.beside}>
          <Text style={body}>{renderRuns(head)}</Text>
          <View
            pointerEvents="none"
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            style={styles.measure}>
            <Text onTextLayout={onMeasure} style={body}>
              {renderRuns(sliceRuns(runs, 0, MEASURE_CHARS), false)}
            </Text>
          </View>
        </View>
      </View>
      {tail.length > 0 ? <Text style={body}>{renderRuns(tail)}</Text> : null}
      {following}
    </View>
  );
}

function buildBlocks(verses: Verse[], highlights: Highlight[]): { cap: string; blocks: Block[] } {
  const blocks: Block[] = [{ key: 'opening', headings: verses[0]?.headings ?? [], runs: [] }];
  let cap = '';
  const current = () => blocks[blocks.length - 1] as Block;
  const open = (key: string, headings: string[]) => {
    // Drop the space that would otherwise end the paragraph before the heading.
    const runs = current().runs;
    if (runs[runs.length - 1]?.text === ' ') runs.pop();
    blocks.push({ key, headings, runs: [] });
  };

  verses.forEach((verse, index) => {
    const phrases = highlights
      .filter((h) => verse.number >= h.verseStart && verse.number <= h.verseEnd)
      .map((h) => (h.verseStart === h.verseEnd ? h.text : undefined));

    if (index > 0 && verse.headings?.length) open(`${verse.number}-h`, verse.headings);
    if (index > 0) {
      // The number is tied to the word after it so a line never ends on a bare numeral.
      current().runs.push({ key: `${verse.number}-n`, verse: verse.number, kind: 'number', text: `${verse.number} `, highlighted: false });
    }

    verseRuns(verse, phrases).forEach((run, i) => {
      if (run.kind === 'headings') {
        open(`${verse.number}-m${i}`, run.headings);
        return;
      }
      let text = run.text;
      if (index === 0 && run.start === 0) {
        // Opening punctuation travels with the letter it introduces.
        cap = /^[^\p{L}\p{N}]*[\p{L}\p{N}]/u.exec(text)?.[0] ?? '';
        text = text.slice(cap.length);
      }
      if (text) {
        current().runs.push({ key: `${verse.number}-${i}`, verse: verse.number, kind: 'text', text, highlighted: run.highlighted });
      }
    });
    if (index < verses.length - 1) {
      current().runs.push({ key: `${verse.number}-s`, verse: verse.number, kind: 'text', text: ' ', highlighted: false });
    }
  });

  return { cap, blocks };
}

/** The part of each run that falls inside `[start, end)` of the concatenated text. */
function sliceRuns(runs: Run[], start: number, end: number): Run[] {
  const out: Run[] = [];
  let cursor = 0;
  for (const run of runs) {
    const from = Math.max(start, cursor);
    const to = Math.min(end, cursor + run.text.length);
    if (to > from) {
      out.push({ ...run, key: `${run.key}@${from}`, text: run.text.slice(from - cursor, to - cursor) });
    }
    cursor += run.text.length;
    if (cursor >= end) break;
  }
  return out;
}

/**
 * Character offset in `flow` where the text after the given laid-out lines begins.
 * Platforms differ on whether a line's text keeps its trailing space, so each
 * line is matched without it. Returns `null` if the lines do not match the text.
 */
function offsetAfterLines(flow: string, lines: string[]): number | null {
  let cursor = 0;
  for (const line of lines) {
    const content = line.trim();
    if (!content) continue;
    const at = flow.indexOf(content, cursor);
    if (at < 0 || flow.slice(cursor, at).trim() !== '') return null;
    cursor = at + content.length;
  }
  while (flow[cursor] === ' ') cursor += 1;
  return cursor;
}

/** react-native-web passes CSS through, so the browser can float the cap as the design does. */
function floatedCap(size: number): TextStyle {
  return {
    float: 'left',
    fontSize: size,
    lineHeight: Math.round(size * 0.82),
    marginTop: 6,
    marginRight: CAP_GAP,
  } as unknown as TextStyle;
}

const styles = StyleSheet.create({
  capRow: { flexDirection: 'row', alignItems: 'flex-start' },
  beside: { flex: 1 },
  cap: { fontFamily: displayFamily(CAP_SIZE, { medium: true }), color: colors.crimson },
  measure: { position: 'absolute', top: 0, left: 0, right: 0, opacity: 0 },
  number: {
    fontFamily: fonts.labelBold,
    fontSize: 9,
    color: colors.crimson,
    // A zero line box keeps the raised numeral from pushing its line apart.
    ...(Platform.OS === 'web' ? ({ verticalAlign: 'super', lineHeight: 0 } as unknown as TextStyle) : null),
  },
  headings: { marginTop: 26, marginBottom: 10, gap: 5 },
  headingsFirst: { marginBottom: 12, gap: 5 },
  heading: { ...label(9.5), color: colors.muted, lineHeight: 15 },
  division: { color: colors.crimson },
  highlighted: { backgroundColor: colors.crimsonTint },
  selected: { backgroundColor: colors.ruleSoft },
});
