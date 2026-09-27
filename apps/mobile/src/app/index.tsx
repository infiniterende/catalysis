import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo, Pill, Screen } from '@/components/ui';
import { Collage } from '@/components/welcome/Collage';
import { body, display, layout, useStyles, type ThemeColors } from '@/theme';

/** 01 · Welcome, shown before login. */
export default function Welcome() {
  const insets = useSafeAreaInsets();
  const styles = useStyles(themed);

  return (
    <Screen>
      {/* The copy scrolls if a small screen or large type cannot fit it; the buttons stay in reach. */}
      <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Logo style={styles.logo} />
        <Collage />
        <View style={styles.copy}>
          <Text accessibilityRole="header" style={styles.headline}>
            Grow in faith, <Text style={styles.accent}>every</Text> day.
          </Text>
          <Text style={styles.deck}>Scripture, prayer, community and Lumen, your AI faith guide.</Text>
        </View>
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom + 8, 34) }]}>
        <Pill
          label="Get started"
          size="lg"
          full
          href={{ pathname: '/login', params: { mode: 'signup' } }}
        />
        <Pill
          label="I already have an account"
          variant="ghost"
          size="lg"
          full
          href={{ pathname: '/login', params: { mode: 'login' } }}
        />
      </View>
    </Screen>
  );
}

const themed = (c: ThemeColors) =>
  StyleSheet.create({
    content: { flexGrow: 1, paddingBottom: 20 },
    logo: { paddingTop: 8, paddingHorizontal: layout.screenWide },
    copy: { paddingTop: 26, paddingHorizontal: layout.screenWide },
    headline: {
      ...display(50, 'extrabold', { lineHeight: 0.95, tracking: -0.04 }),
      color: c.ink,
      // A line box tighter than the face clips the ascenders on Android without this.
      paddingTop: 4,
    },
    accent: { color: c.a1 },
    deck: { ...body(16, 'regular', { lineHeight: 1.5 }), color: c.muted, marginTop: 14 },
    actions: { gap: 10, paddingTop: 10, paddingHorizontal: layout.screenWide },
  });
