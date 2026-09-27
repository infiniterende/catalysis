// Each weight is imported from its own entry so only the faces in use are bundled.
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_600SemiBold } from '@expo-google-fonts/dm-sans/600SemiBold';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { Newsreader_400Regular } from '@expo-google-fonts/newsreader/400Regular';
import { Newsreader_500Medium } from '@expo-google-fonts/newsreader/500Medium';
import { Outfit_300Light } from '@expo-google-fonts/outfit/300Light';
import { Outfit_400Regular } from '@expo-google-fonts/outfit/400Regular';
import { Outfit_500Medium } from '@expo-google-fonts/outfit/500Medium';
import { Outfit_700Bold } from '@expo-google-fonts/outfit/700Bold';
import { Outfit_800ExtraBold } from '@expo-google-fonts/outfit/800ExtraBold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { setBibleSource } from '@catalysis/api';
import { loadNabreBook } from '@catalysis/bible-nabre';

import { loadAppearance } from '@/lib/appearance';
import { hydrate, useApp } from '@/lib/store';
import { ThemeProvider, useStyles, useTheme, WEB_FRAME_WIDTH, type ThemeColors } from '@/theme';

void SplashScreen.preventAutoHideAsync();

// The reader's text is bundled with the app, so Scripture works offline.
setBibleSource(loadNabreBook, 'nabre');

export default function RootLayout() {
  // Keys are the family names the type helpers refer to (`families` in src/theme/type.ts).
  const [fontsLoaded, fontError] = useFonts({
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    Newsreader_400Regular,
    Newsreader_500Medium,
  });
  const hydrated = useApp((s) => s.hydrated);
  const [appearanceRead, setAppearanceRead] = useState(false);

  useEffect(() => {
    void hydrate();
    // Resolves even when storage fails, so the splash screen is never stranded.
    void loadAppearance().then(() => setAppearanceRead(true));
  }, []);

  // A font that fails to load should not strand the user on the splash screen.
  // The saved appearance is read first, so the app never flashes the wrong theme.
  const ready = hydrated && appearanceRead && (fontsLoaded || fontError !== null);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function App() {
  const { colors, scheme } = useTheme();
  const themedStyles = useStyles(themed);
  const signedIn = useApp((s) => s.user !== null);
  const onPhoto = { contentStyle: { backgroundColor: colors.photo } };

  return (
    <View style={themedStyles.backdrop}>
      {/* Follows the theme; a screen on dark imagery overrides it with `<Screen statusBar="light">`. */}
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <View style={styles.frame}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
          </Stack.Protected>

          <Stack.Protected guard={signedIn}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="reader/[book]/[chapter]" />
            <Stack.Screen name="lumen" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="saved" />
            <Stack.Screen name="search" />
            <Stack.Screen name="post/[id]" />
            <Stack.Screen name="guided/[id]" options={{ presentation: 'fullScreenModal', ...onPhoto }} />
            <Stack.Screen name="create" options={{ presentation: 'fullScreenModal', ...onPhoto }} />
          </Stack.Protected>
        </Stack>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // In a desktop browser the app keeps to a phone-width column.
  frame: Platform.select({
    web: { flex: 1, width: '100%', maxWidth: WEB_FRAME_WIDTH, alignSelf: 'center', overflow: 'hidden' },
    default: { flex: 1 },
  }),
});

const themed = (c: ThemeColors) =>
  StyleSheet.create({
    // Around the phone column on the web; behind the screens everywhere else.
    backdrop: { flex: 1, backgroundColor: Platform.OS === 'web' ? c.inset : c.bg },
  });
