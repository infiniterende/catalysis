import { localAuth, type AuthErrors, type AuthProvider, type AuthResult } from '@catalysis/api';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Divider, Field, FieldError, IconButton, Pill, Screen, ScreenHeader, Segmented, Touchable,
} from '@/components/ui';
import { actions } from '@/lib/store';
import { body, display, layout, useStyles, type ThemeColors } from '@/theme';

type Mode = 'login' | 'signup';

const MODES = [
  { key: 'login', label: 'Log in' },
  { key: 'signup', label: 'Sign up' },
] as const;

/** The headline's last word is set in the accent colour. */
const COPY: Record<Mode, { lead: string; accent: string; deck: string; submit: string }> = {
  login: { lead: 'Welcome', accent: 'back.', deck: 'Your streak is waiting for you.', submit: 'Log in' },
  signup: { lead: 'Join', accent: 'us.', deck: 'Create your account. It takes a minute.', submit: 'Create account' },
};

/** 02 · Log in / Sign up. */
export default function Login() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const insets = useSafeAreaInsets();
  const styles = useStyles(themed);

  const [mode, setMode] = useState<Mode>(params.mode === 'signup' ? 'signup' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<AuthErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const copy = COPY[mode];

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrors({});
    setNotice(null);
  };

  const finish = (result: AuthResult) => {
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    // Starting the session flips the root layout's guard, which replaces this screen with Home.
    actions().startSession(result.user);
  };

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setErrors({});
    setNotice(null);
    try {
      await task();
    } catch {
      setErrors({ form: 'Something went wrong. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  const submit = () =>
    run(async () => {
      finish(
        mode === 'signup'
          ? await localAuth.signUp({ name, email, password })
          : await localAuth.signIn({ email, password }),
      );
    });

  const withProvider = (provider: AuthProvider) =>
    run(async () => {
      finish(await localAuth.signInWithProvider(provider));
    });

  const forgotPassword = () =>
    run(async () => {
      const result = await localAuth.requestPasswordReset(email);
      if (result.ok) setNotice(`If an account exists for ${email.trim()}, a reset link is on its way.`);
      else setErrors(result.errors);
    });

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
          <ScreenHeader back padH={0} style={styles.header} />

          <Text accessibilityRole="header" style={styles.headline}>
            {copy.lead} <Text style={styles.accent}>{copy.accent}</Text>
          </Text>
          <Text style={styles.deck}>{copy.deck}</Text>

          <Segmented options={MODES} value={mode} onChange={switchMode} style={styles.modes} />

          {mode === 'signup' ? (
            <Field
              label="Name"
              labelStyle="plain"
              icon="user"
              value={name}
              onChangeText={setName}
              error={errors.name}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
              style={styles.firstField}
            />
          ) : null}
          <Field
            label="Email"
            labelStyle="plain"
            icon="mail"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            keyboardType="email-address"
            returnKeyType="next"
            style={mode === 'signup' ? styles.field : styles.firstField}
          />
          <Field
            label="Password"
            labelStyle="plain"
            icon="lock"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            textContentType={mode === 'signup' ? 'newPassword' : 'password'}
            returnKeyType="go"
            onSubmitEditing={submit}
            style={styles.field}
            accessory={
              <IconButton
                name={showPassword ? 'eye-off' : 'eye'}
                label={showPassword ? 'Hide password' : 'Show password'}
                variant="plain"
                size={24}
                iconSize={16}
                onPress={() => setShowPassword((shown) => !shown)}
                style={styles.eye}
              />
            }
          />

          {mode === 'login' ? (
            <Touchable onPress={forgotPassword} disabled={busy} accessibilityRole="button" style={styles.forgot}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Touchable>
          ) : null}
          {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}

          {errors.form ? <FieldError style={styles.formError}>{errors.form}</FieldError> : null}
          <Pill label={copy.submit} size="lg" full busy={busy} onPress={submit} style={styles.submit} />

          <Divider label="or" style={styles.or} />

          <View style={styles.providers}>
            <Provider label="Google" disabled={busy} onPress={() => withProvider('google')} />
            <Provider label="Apple" disabled={busy} onPress={() => withProvider('apple')} />
          </View>

          <Text style={styles.switch}>
            {mode === 'login' ? 'New here? ' : 'Already a member? '}
            <Text
              accessibilityRole="link"
              onPress={() => switchMode(mode === 'login' ? 'signup' : 'login')}
              style={styles.switchLink}>
              {mode === 'login' ? 'Create an account' : 'Log in'}
            </Text>
          </Text>
          <Text style={styles.demo}>Demo: maria.acosta@nyu.edu, any 8+ character password.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Provider({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  const styles = useStyles(themed);
  return (
    <Pill
      label={label}
      variant="ghost"
      fontSize={15}
      padV={14}
      disabled={disabled}
      onPress={onPress}
      accessibilityLabel={`Continue with ${label}`}
      style={styles.fill}
    />
  );
}

const themed = (c: ThemeColors) =>
  StyleSheet.create({
    fill: { flex: 1 },
    content: { paddingHorizontal: layout.screenWide },
    header: { paddingTop: 14 },
    headline: {
      ...display(48, 'extrabold', { lineHeight: 0.95, tracking: -0.04 }),
      color: c.ink,
      marginTop: 24,
      // A line box tighter than the face clips the ascenders on Android without this.
      paddingTop: 4,
    },
    accent: { color: c.a1 },
    deck: { ...body(16), color: c.muted, marginTop: 10 },
    modes: { marginTop: 28 },
    firstField: { marginTop: 22 },
    field: { marginTop: 16 },
    eye: { margin: -2 },
    forgot: { alignSelf: 'flex-end', marginTop: 12 },
    forgotText: { ...body(14, 'semibold'), color: c.ink },
    notice: { ...body(14, 'regular', { lineHeight: 1.5 }), color: c.muted, marginTop: 12 },
    formError: { marginTop: 12 },
    submit: { marginTop: 20 },
    or: { marginVertical: 22 },
    providers: { flexDirection: 'row', gap: 10 },
    switch: { ...body(14), color: c.muted, textAlign: 'center', marginTop: 22 },
    switchLink: { ...body(14, 'bold'), color: c.ink },
    demo: { ...body(12.5, 'regular', { lineHeight: 1.5 }), color: c.subtle, textAlign: 'center', marginTop: 14 },
  });
