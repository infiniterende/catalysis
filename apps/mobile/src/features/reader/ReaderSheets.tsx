import type { LumenResult, ReaderSettings } from '@catalysis/api';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, TextLink } from '@/components/Buttons';
import { Field, FieldError } from '@/components/Field';
import { Label } from '@/components/Label';
import { Sheet } from '@/components/Sheet';
import { SkeletonLines } from '@/components/States';
import { Touchable } from '@/components/Touchable';
import { MessageBlocks, SourceList } from '@/features/lumen/MessageBlocks';
import { askLumen, createThrottle, errorMessage, isAbort } from '@/lib/lumen';
import { colors, display } from '@/theme';

const SIZES = [
  { value: 0.9, label: 'Small' },
  { value: 1, label: 'Medium' },
  { value: 1.15, label: 'Large' },
  { value: 1.3, label: 'Largest' },
];

const SPACINGS = [
  { value: 0.9, label: 'Close' },
  { value: 1, label: 'Normal' },
  { value: 1.15, label: 'Open' },
];

interface TypeSheetProps {
  visible: boolean;
  onClose: () => void;
  settings: ReaderSettings;
  onChange: (patch: Partial<ReaderSettings>) => void;
}

/** Text size and line spacing for the reader. */
export function TypeSheet({ visible, onClose, settings, onChange }: TypeSheetProps) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Type">
      <Label size={9} color={colors.muted}>Text size</Label>
      <View style={styles.steps} accessibilityRole="radiogroup">
        {SIZES.map((step) => (
          <Step
            key={step.value}
            label={step.label}
            selected={settings.scale === step.value}
            onPress={() => onChange({ scale: step.value })}>
            <Text style={[display(15 * step.value + 3), styles.sample]}>A</Text>
          </Step>
        ))}
      </View>

      <Label size={9} color={colors.muted} style={styles.second}>Line spacing</Label>
      <View style={styles.steps} accessibilityRole="radiogroup">
        {SPACINGS.map((step) => (
          <Step
            key={step.value}
            label={step.label}
            selected={settings.spacing === step.value}
            onPress={() => onChange({ spacing: step.value })}>
            <View style={{ gap: 3 + (step.value - 0.9) * 16 }}>
              <View style={styles.bar} />
              <View style={styles.bar} />
              <View style={styles.bar} />
            </View>
          </Step>
        ))}
      </View>
    </Sheet>
  );
}

interface StepProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  children: React.ReactNode;
}

function Step({ label, selected, onPress, children }: StepProps) {
  return (
    <Touchable
      hitSlop={undefined}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={[styles.step, selected && styles.stepSelected]}>
      <View style={styles.stepGlyph}>{children}</View>
      <Label size={8} color={selected ? colors.crimson : colors.muted} weight={selected ? 'bold' : 'medium'}>
        {label}
      </Label>
    </Touchable>
  );
}

interface NoteSheetProps {
  /** `John 1:4` */
  reference: string;
  initialText: string;
  onSave: (text: string) => void;
  onClose: () => void;
}

/** Mounted only while open, so the draft starts from the saved note each time. */
export function NoteSheet({ reference, initialText, onSave, onClose }: NoteSheetProps) {
  const [draft, setDraft] = useState(initialText);
  const save = (value: string) => {
    onSave(value);
    onClose();
  };
  return (
    <Sheet visible onClose={onClose} title="Note">
      <Field
        label={reference}
        value={draft}
        onChangeText={setDraft}
        placeholder="What does this verse say to you?"
        multiline
        autoFocus
      />
      <PrimaryButton label="Save note" onPress={() => save(draft)} style={styles.save} />
      {initialText ? (
        <TextLink label="Delete note" color={colors.crimson} onPress={() => save('')} style={styles.delete} />
      ) : null}
    </Sheet>
  );
}

interface ExplainSheetProps {
  passage: { reference: string; text: string };
  onClose: () => void;
}

interface Explanation {
  attempt: number;
  content: string;
  result?: LumenResult;
  error?: string;
}

/** Streams Lumen's explanation of a verse. Mounted only while open; closing aborts the stream. */
export function ExplainSheet({ passage, onClose }: ExplainSheetProps) {
  const { reference, text: verse } = passage;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Explanation>({ attempt: 0, content: '' });
  const current: Explanation = state.attempt === attempt ? state : { attempt, content: '' };

  useEffect(() => {
    const controller = new AbortController();
    const throttle = createThrottle((content) => {
      if (!controller.signal.aborted) setState({ attempt, content });
    });

    askLumen(
      {
        mode: 'explain',
        messages: [{ role: 'user', content: `Explain ${reference}.` }],
        passage: { reference, text: verse },
      },
      { onDelta: throttle.push, signal: controller.signal },
    )
      .then((result) => {
        throttle.cancel();
        if (!controller.signal.aborted) setState({ attempt, content: result.content, result });
      })
      .catch((error: unknown) => {
        throttle.cancel();
        if (!controller.signal.aborted && !isAbort(error)) {
          setState({ attempt, content: '', error: errorMessage(error) });
        }
      });

    return () => {
      controller.abort();
      throttle.cancel();
    };
  }, [attempt, reference, verse]);

  const citations = current.result?.citations ?? [];

  return (
    <Sheet visible onClose={onClose} title="Lumen explains" scroll>
      <Label size={9} color={colors.crimson}>{reference}</Label>
      <Text style={styles.verse}>{verse}</Text>

      <View style={styles.answer}>
        {current.error ? (
          <>
            <FieldError>{current.error}</FieldError>
            <TextLink label="Try again" onPress={() => setAttempt((n) => n + 1)} style={styles.retry} />
          </>
        ) : current.content ? (
          <MessageBlocks content={current.content} />
        ) : (
          <SkeletonLines lines={3} gap={12} height={12} />
        )}
      </View>

      {citations.length > 0 ? (
        <>
          <Label weight="semibold" style={styles.crossHeading}>Cross references</Label>
          <SourceList citations={citations} />
        </>
      ) : null}
      {current.result?.demo ? <Label size={8} color={colors.subtle} style={styles.demo}>Demo answer</Label> : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: 'row', gap: 8, marginTop: 10 },
  second: { marginTop: 22 },
  step: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.rule,
  },
  stepSelected: { borderColor: colors.ink },
  stepGlyph: { height: 30, justifyContent: 'center' },
  sample: { color: colors.ink },
  bar: { width: 26, height: 1.5, backgroundColor: colors.ink },
  save: { marginTop: 20 },
  delete: { marginTop: 16, alignSelf: 'center' },
  verse: { ...display(19, { italic: true, lineHeight: 1.35 }), color: colors.ink, marginTop: 10 },
  answer: { marginTop: 18 },
  retry: { marginTop: 12 },
  crossHeading: { marginTop: 24, marginBottom: 10 },
  demo: { marginTop: 14 },
});
