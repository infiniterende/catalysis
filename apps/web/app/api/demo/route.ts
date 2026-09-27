import { isDatabaseConfigured } from '@catalysis/db';
import { json } from '@/lib/server/auth';
import { demoQuestions, demoTokens } from '@/lib/server/demo';
import { approvedVideos } from '@/lib/server/tiktok';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/demo → what a visitor trying the demo account may see of the real
 * app: the TikTok videos approved for Reels, which are public already, and how
 * much of Lumen the demo allows. Nothing about any member.
 */
export async function GET() {
  let tiktok: Awaited<ReturnType<typeof approvedVideos>> = [];
  if (isDatabaseConfigured()) {
    try {
      tiktok = await approvedVideos();
    } catch (error) {
      console.error('[api] GET /api/demo', error);
    }
  }
  return json({ tiktok, lumen: { questions: demoQuestions(), tokens: demoTokens() } });
}
