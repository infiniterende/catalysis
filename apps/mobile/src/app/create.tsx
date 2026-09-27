import type { Audience, PostType, VerseRef } from '@catalysis/api';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chip } from '@/components/Buttons';
import { Label } from '@/components/Label';
import { Placeholder } from '@/components/Photo';
import { Screen } from '@/components/Screen';
import { Tabs } from '@/components/Tabs';
import { Touchable } from '@/components/Touchable';
import { CameraStage, type Captured } from '@/features/create/CameraStage';
import { PostOptions } from '@/features/create/PostOptions';
import { actions } from '@/lib/store';
import { colors, display, text } from '@/theme';

type Mode = 'photo' | 'reel' | 'text';

const MODES = [
  { key: 'photo', label: 'Photo' },
  { key: 'reel', label: 'Reel' },
  { key: 'text', label: 'Text' },
] as const satisfies readonly { key: Mode; label: string }[];

const PARISH_GROUP_ID = 'g-newman';

const isMode = (value: string | undefined): value is Mode =>
  value === 'photo' || value === 'reel' || value === 'text';

/** 12 · Create Post. Full screen, black. */
export default function Create() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();

  const [mode, setMode] = useState<Mode>(isMode(params.mode) ? params.mode : 'reel');
  const [step, setStep] = useState<'compose' | 'caption'>('compose');
  const [captured, setCaptured] = useState<Captured | null>(null);
  const [body, setBody] = useState('');
  const [caption, setCaption] = useState('');
  const [request, setRequest] = useState(false);
  const [verse, setVerse] = useState<VerseRef | null>(null);
  const [shareToParish, setShareToParish] = useState(false);
  const [audience, setAudience] = useState<Audience>('everyone');
  const [toast, setToast] = useState<string | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const showToast = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  };

  const isText = mode === 'text';
  const hasContent = isText ? body.trim().length > 0 : captured !== null;
  const captioning = step === 'caption' && !isText;

  const close = () => (router.canGoBack() ? router.back() : router.replace('/today'));

  const changeMode = (next: Mode) => {
    setMode(next);
    setStep('compose');
    // A photo cannot become a reel, so media taken in one mode does not carry to the other.
    setCaptured(null);
  };

  const toggleParish = (on: boolean) => {
    setShareToParish(on);
    setAudience(on ? 'parish' : 'everyone');
  };

  const publish = () => {
    const type: PostType = isText ? (request ? 'request' : 'reflection') : mode === 'reel' ? 'reel' : 'photo';
    const post = actions().addPost({
      type,
      body: isText ? body : caption,
      media: !isText && captured ? { kind: captured.kind, url: captured.uri } : undefined,
      verse: verse ?? undefined,
      groupId: shareToParish ? PARISH_GROUP_ID : undefined,
      audience,
    });
    if (!post) {
      showToast('Add something to share first');
      return;
    }
    const destination = type === 'reel' ? '/reels' : '/community';
    if (router.canGoBack()) {
      router.back();
      router.navigate(destination);
    } else {
      router.replace(destination);
    }
  };

  const next = () => {
    if (!hasContent) return;
    if (isText || captioning) publish();
    else setStep('caption');
  };

  return (
    <Screen tone="black">
      <View style={styles.header}>
        <Touchable
          onPress={captioning ? () => setStep('compose') : close}
          accessibilityRole="button"
          accessibilityLabel={captioning ? 'Back' : 'Cancel'}
          style={styles.headerSide}>
          <Label color={colors.onDarkMuted}>{captioning ? 'Back' : 'Cancel'}</Label>
        </Touchable>
        <Text accessibilityRole="header" style={styles.title}>New post</Text>
        <View style={[styles.headerSide, styles.headerRight]}>
          <Touchable
            onPress={next}
            disabled={!hasContent}
            accessibilityRole="button"
            accessibilityLabel={isText || captioning ? 'Share' : 'Next'}
            accessibilityState={{ disabled: !hasContent }}
            style={[styles.next, !hasContent && styles.nextDisabled]}>
            <Label weight="semibold" color={hasContent ? colors.white : colors.subtle}>
              {isText || captioning ? 'Share' : 'Next'}
            </Label>
          </Touchable>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        {captioning && captured ? (
          <View style={styles.fill}>
            <View style={styles.captionRow}>
              {captured.kind === 'image' ? (
                <Image source={{ uri: captured.uri }} contentFit="cover" style={styles.thumb} />
              ) : (
                <Placeholder style={styles.thumb} />
              )}
              <TextInput
                value={caption}
                onChangeText={setCaption}
                placeholder="Write a caption…"
                placeholderTextColor={colors.subtle}
                selectionColor={colors.crimsonOnDark}
                accessibilityLabel="Caption"
                multiline
                autoFocus
                style={[styles.captionInput, caption.length === 0 && styles.italic]}
              />
            </View>
          </View>
        ) : isText ? (
          <View style={styles.fill}>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Share a reflection or an intention…"
              placeholderTextColor={colors.subtle}
              selectionColor={colors.crimsonOnDark}
              accessibilityLabel="Your reflection or intention"
              multiline
              style={styles.textInput}
            />
            <View style={styles.request}>
              <Chip
                tone="dark"
                padV={9}
                label="Prayer request"
                filled={request}
                selected={request}
                onPress={() => setRequest((on) => !on)}
              />
            </View>
          </View>
        ) : (
          <CameraStage key={mode} mode={mode} captured={captured} onCapture={setCaptured} onToast={showToast} />
        )}

        {toast ? (
          <View pointerEvents="none" style={styles.toast} accessibilityLiveRegion="polite">
            <Label size={9} color={colors.white}>{toast}</Label>
          </View>
        ) : null}

        {captioning ? null : (
          <Tabs tabs={MODES} value={mode} onChange={changeMode} variant="mode" gap={30} style={styles.modes} />
        )}
      </KeyboardAvoidingView>

      <PostOptions
        verse={verse}
        onVerse={setVerse}
        shareToParish={shareToParish}
        onShareToParish={toggleParish}
        audience={audience}
        onAudience={setAudience}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 14,
    paddingHorizontal: 20,
  },
  headerSide: { minWidth: 76 },
  headerRight: { alignItems: 'flex-end' },
  title: { ...display(22), color: colors.white },
  next: { backgroundColor: colors.crimson, paddingVertical: 8, paddingHorizontal: 12 },
  nextDisabled: { backgroundColor: colors.sheet },
  modes: { paddingVertical: 18 },
  textInput: {
    ...text(24, { italic: true, lineHeight: 1.4 }),
    flex: 1,
    color: colors.paper,
    paddingTop: 20,
    paddingHorizontal: 24,
    textAlignVertical: 'top',
    outlineWidth: 0,
  },
  request: { paddingHorizontal: 24, paddingBottom: 6 },
  captionRow: { flexDirection: 'row', gap: 16, paddingTop: 12, paddingHorizontal: 20 },
  thumb: { width: 84, height: 112 },
  captionInput: {
    ...text(17, { lineHeight: 1.5 }),
    flex: 1,
    minHeight: 112,
    color: colors.paper,
    paddingVertical: 0,
    textAlignVertical: 'top',
    outlineWidth: 0,
  },
  italic: { ...text(17, { italic: true, lineHeight: 1.5 }) },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    top: 16,
    paddingVertical: 9,
    paddingHorizontal: 13,
    backgroundColor: 'rgba(11,11,11,0.78)',
  },
});
