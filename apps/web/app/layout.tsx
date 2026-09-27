import type { Metadata, Viewport } from 'next';
import { DM_Sans, Newsreader, Outfit } from 'next/font/google';
import { StoreProvider } from '@/lib/store';
import { ThemeProvider } from '@/lib/theme';
import { THEME_SCRIPT } from '@/lib/theme-script';
import './globals.css';

const outfit = Outfit({ variable: '--font-outfit', subsets: ['latin'], display: 'swap' });
const dmSans = DM_Sans({ variable: '--font-dm-sans', subsets: ['latin'], axes: ['opsz'], display: 'swap' });
const newsreader = Newsreader({ variable: '--font-newsreader', subsets: ['latin'], axes: ['opsz'], display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Catalysis', template: '%s · Catalysis' },
  description:
    'Daily scripture, prayer streaks, a community that shows up for you, and Lumen, an AI that answers from Scripture and the Catechism.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#0C0C0F' },
  ],
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // The theme is set before first paint by THEME_SCRIPT, so the attribute may differ from the server's.
    <html lang="en" data-theme="light" suppressHydrationWarning className={`${outfit.variable} ${dmSans.variable} ${newsreader.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        <ThemeProvider>
          <StoreProvider>{children}</StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
