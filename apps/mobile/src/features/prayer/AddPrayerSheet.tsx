import { formatTime12, pad2 } from '@catalysis/api';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/Buttons';
import { Field } from '@/components/Field';
import { Label } from '@/components/Label';
import { Sheet } from '@/components/Sheet';
import { Touchable } from '@/components/Touchable';
import { colors, display } from '@/theme';

interface AddPrayerSheetProps {
  onAdd: (input: { title: string; scheduledTime: string }) => void;
  onClose: () => void;
}

const MINUTE_STEP = 5;

/** Mounted only while open, so it always starts empty. */
export function AddPrayerSheet({ onAdd, onClose }: AddPrayerSheetProps) {
  const [title, setTitle] = useState('');
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [error, setError] = useState<string | undefined>();

  const scheduledTime = `${pad2(hour)}:${pad2(minute)}`;

  const submit = () => {
    if (!title.trim()) {
      setError('Give the prayer a name.');
      return;
    }
    onAdd({ title, scheduledTime });
    onClose();
  };

  return (
    <Sheet visible onClose={onClose} title="Add prayer">
      <Field
        label="Prayer"
        value={title}
        onChangeText={(value) => {
          setTitle(value);
          setError(undefined);
        }}
        error={error}
        placeholder="Night Prayer"
        autoCapitalize="words"
        autoFocus
        returnKeyType="done"
        onSubmitEditing={submit}
      />

      <Label color={colors.muted} style={styles.timeLabel}>Time</Label>
      <View style={styles.time}>
        <Text style={styles.clock} accessibilityLabel={`Scheduled for ${formatTime12(scheduledTime)}`}>
          {formatTime12(scheduledTime)}
        </Text>
        <View style={styles.steppers}>
          <Stepper
            label="Hour"
            onDown={() => setHour((h) => (h + 23) % 24)}
            onUp={() => setHour((h) => (h + 1) % 24)}
          />
          <Stepper
            label="Minute"
            onDown={() => setMinute((m) => (m + 60 - MINUTE_STEP) % 60)}
            onUp={() => setMinute((m) => (m + MINUTE_STEP) % 60)}
          />
        </View>
      </View>

      <PrimaryButton label="Add to my rule" onPress={submit} style={styles.submit} />
    </Sheet>
  );
}

interface StepperProps {
  label: string;
  onDown: () => void;
  onUp: () => void;
}

function Stepper({ label, onDown, onUp }: StepperProps) {
  return (
    <View style={styles.stepper}>
      <Touchable
        hitSlop={undefined}
        onPress={onDown}
        accessibilityRole="button"
        accessibilityLabel={`${label} earlier`}
        style={styles.stepButton}>
        <Text style={styles.stepGlyph}>−</Text>
      </Touchable>
      <Label size={8} color={colors.muted} style={styles.stepLabel}>{label}</Label>
      <Touchable
        hitSlop={undefined}
        onPress={onUp}
        accessibilityRole="button"
        accessibilityLabel={`${label} later`}
        style={styles.stepButton}>
        <Text style={styles.stepGlyph}>+</Text>
      </Touchable>
    </View>
  );
}

const styles = StyleSheet.create({
  timeLabel: { marginTop: 22 },
  time: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink,
  },
  clock: { ...display(30), color: colors.ink },
  steppers: { gap: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepButton: {
    width: 44,
    height: 36,
    borderWidth: 1,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepGlyph: { ...display(20), color: colors.ink },
  stepLabel: { width: 64, textAlign: 'center' },
  submit: { marginTop: 22 },
});
