import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Label } from '@/components/Label';
import { Sheet } from '@/components/Sheet';
import { Touchable } from '@/components/Touchable';
import { actions, store } from '@/lib/store';
import { colors, onDark, text } from '@/theme';

export interface ModerationTarget {
  kind: 'post' | 'reel';
  id: string;
  authorId: string;
  authorName: string;
}

interface ModerationOptions {
  tone?: 'light' | 'dark';
}

interface SheetState {
  target: ModerationTarget;
  /** Set once the user has acted; the sheet then shows this instead of the actions. */
  confirmation?: string;
}

/**
 * Report and Block for user-generated content, required on every post and reel.
 * On the user's own work the sheet offers to remove it instead.
 * Returns `open` to call from a "more" button or long-press, and the sheet to render.
 */
export function useModeration({ tone = 'light' }: ModerationOptions = {}): {
  open: (target: ModerationTarget) => void;
  sheet: ReactNode;
} {
  const [visible, setVisible] = useState(false);
  // Kept after closing so the sheet's contents do not vanish while it slides away.
  const [state, setState] = useState<SheetState | null>(null);
  const dark = tone === 'dark';

  const open = (target: ModerationTarget) => {
    setState({ target });
    setVisible(true);
  };

  const own = state?.target.authorId === store.getState().user?.id;

  const report = ({ target }: SheetState) => {
    if (target.kind === 'reel') actions().reportReel(target.id);
    // The user's own reel is also a post, and is hidden as one.
    if (target.kind === 'post' || own) actions().reportPost(target.id);
    setState({
      target,
      confirmation: own
        ? `Your ${target.kind} has been removed.`
        : `Thank you. This ${target.kind} has been hidden and sent for review.`,
    });
  };

  const block = ({ target }: SheetState) => {
    actions().blockUser(target.authorId);
    setState({ target, confirmation: `${target.authorName} is blocked. You will no longer see their posts, reels or replies.` });
  };

  const rule = { borderBottomColor: dark ? onDark.ruleSoft : colors.rule };
  const danger = dark ? colors.crimsonOnDark : colors.crimson;

  const sheet = (
    <Sheet visible={visible} onClose={() => setVisible(false)} title={state?.target.authorName} tone={tone}>
      {state?.confirmation ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.confirmation, { color: dark ? colors.onDarkBody : colors.muted }]}>
          {state.confirmation}
        </Text>
      ) : state ? (
        <View style={[styles.actions, { borderTopColor: dark ? onDark.rule : colors.ink }]}>
          <Touchable
            hitSlop={undefined}
            onPress={() => report(state)}
            accessibilityRole="button"
            style={[styles.action, rule]}>
            <Label color={danger}>
              {own ? `Remove my ${state.target.kind}` : `Report ${state.target.kind}`}
            </Label>
          </Touchable>
          {own ? null : (
            <Touchable
              hitSlop={undefined}
              onPress={() => block(state)}
              accessibilityRole="button"
              style={[styles.action, rule]}>
              <Label color={danger}>Block {state.target.authorName}</Label>
            </Touchable>
          )}
        </View>
      ) : null}
    </Sheet>
  );

  return { open, sheet };
}

const styles = StyleSheet.create({
  actions: { borderTopWidth: 1 },
  action: { paddingVertical: 16, borderBottomWidth: 1 },
  confirmation: { ...text(15, { italic: true, lineHeight: 1.5 }), paddingVertical: 12 },
});
