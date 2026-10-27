/**
 * Reads the Liturgy of the Hours from iBreviary (ibreviary.com), which has no
 * API: its mobile pages are fetched and parsed. A session is opened for the
 * date, the day page is checked to be the date asked for (iBreviary falls back
 * silently to another day when a date is not taken), and then the hour is read.
 */
import { HOURS, type HourId, type HourLine, type HourPara, type HourSection, type HourSpan, type ISODate } from '@catalysis/api';

const BASE = 'https://www.ibreviary.com/m2';
const USER_AGENT = 'Catalysis/1.0 (Liturgy of the Hours reader; +https://github.com/infiniterende/catalysis)';
const STEP_TIMEOUT = 12_000;

export const IBREVIARY = { name: 'iBreviary', url: 'https://www.ibreviary.com' };

const CODES: Record<HourId, string> = {
  readings: 'ufficio_delle_letture',
  lauds: 'lodi',
  daytime: 'ora_media',
  vespers: 'vespri',
  compline: 'compieta',
};

export class SourceError extends Error {}

/* ---------- HTML ---------- */

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: '’', nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
  mdash: '—', ndash: '–', dagger: '†', Dagger: '‡', hellip: '…', copy: '©', reg: '®', middot: '·', laquo: '«', raquo: '»',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', agrave: 'à', egrave: 'è', igrave: 'ì', ograve: 'ò',
  ugrave: 'ù', ntilde: 'ñ', ccedil: 'ç', auml: 'ä', ouml: 'ö', uuml: 'ü', Aacute: 'Á', Eacute: 'É', Oacute: 'Ó',
  acirc: 'â', ecirc: 'ê', ocirc: 'ô', aelig: 'æ', oelig: 'œ', szlig: 'ß', shy: '', thinsp: ' ', ensp: ' ', emsp: ' ',
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
    if (name[0] === '#') {
      const code = name[1]?.toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[name] ?? whole;
  });
}

const SMALL = new Set(['a', 'an', 'and', 'of', 'the', 'to', 'in', 'for', 'or', 'on']);

/** "THE LORD’S PRAYER" → "The Lord’s Prayer". */
function titleCase(text: string): string {
  return text
    .toLowerCase()
    .split(/(\s+)/)
    .map((word, i) => (i > 0 && SMALL.has(word) ? word : word.replace(/\p{L}/u, (c) => c.toUpperCase())))
    .join('');
}

/** Anchors where the optional material at the end of a page begins: other invitatory psalms, other hymns, complementary psalmody. */
const OPTIONAL = /<a\s+name="(?:ps\d+|alternatehymn|complementary)"/i;

/**
 * Turns an hour's page into sections of paragraphs of lines of styled spans.
 * Only text and three styles survive: nothing from the page is passed on as HTML.
 */
export function parseHourPage(html: string): HourSection[] {
  const start = html.indexOf('<div id="contenuto">');
  if (start < 0) throw new SourceError('The page had no text in it.');
  let body = html.slice(start);
  const end = body.search(/<script\b|<\/body>/i);
  if (end > 0) body = body.slice(0, end);
  const optional = body.search(OPTIONAL);
  if (optional > 0) body = body.slice(0, optional);
  body = body
    .replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi, '')
    .replace(/<span class="sezione">[\s\S]*?<\/span>/gi, '')
    // Links on the page jump between its parts; they are not part of the prayer.
    .replace(/<a\b[^>]*href=[^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/<a\b[^>]*>\s*<\/a>/gi, '');

  const sections: HourSection[] = [];
  let section: HourSection | undefined;
  let para: HourPara = [];
  let line: HourLine = { spans: [] };
  let breaks = 0;
  const styles: (HourSpan['s'] | 'heading' | null)[] = [];
  let heading = '';

  const style = (): HourSpan['s'] | undefined => {
    for (let i = styles.length - 1; i >= 0; i--) {
      const s = styles[i];
      if (s === 'r' || s === 'i') return s;
    }
    return undefined;
  };
  const endLine = () => {
    const spans = line.spans
      .map((s) => ({ ...s, t: s.t.replace(/[ \t\r\n ]+/g, ' ') }))
      .filter((s) => s.t.length > 0);
    if (spans[0]) spans[0].t = spans[0].t.replace(/^ /, '');
    const last = spans[spans.length - 1];
    if (last) last.t = last.t.replace(/ $/, '');
    const kept = spans.filter((s) => s.t.length > 0);
    if (kept.length > 0) para.push({ spans: kept, ...(line.indent ? { indent: true } : {}) });
    line = { spans: [] };
  };
  const endPara = () => {
    endLine();
    if (para.length > 0) {
      if (!section) {
        section = { title: '', paras: [] };
        sections.push(section);
      }
      section.paras.push(para);
    }
    para = [];
  };
  const addText = (raw: string) => {
    let text = decodeEntities(raw);
    if (styles.includes('heading')) {
      heading += text;
      return;
    }
    if (line.spans.length === 0) {
      // A line that opens with spaces is the second half of a psalm verse.
      if (/^[ \t\r\n]* /.test(text)) line.indent = true;
      text = text.replace(/^[\s ]+/, '');
      if (!text) return;
    }
    if (/\S/.test(text)) breaks = 0;
    const s = style();
    const last = line.spans[line.spans.length - 1];
    if (last && last.s === s) last.t += text;
    else line.spans.push(s ? { t: text, s } : { t: text });
  };

  for (const token of body.split(/(<[^>]+>)/)) {
    if (!token) continue;
    if (token[0] !== '<') {
      addText(token);
      continue;
    }
    const tag = /^<\s*(\/?)\s*([a-z0-9]+)([^>]*)>/i.exec(token);
    if (!tag) continue;
    const [, closing, nameRaw = '', attrs = ''] = tag;
    const name = nameRaw.toLowerCase();
    if (name === 'br') {
      breaks += 1;
      if (breaks >= 2) endPara();
      else endLine();
    } else if (name === 'p' || name === 'div') {
      endPara();
      breaks = 0;
    } else if (name === 'span' || name === 'em' || name === 'i' || name === 'b' || name === 'strong') {
      if (closing) {
        const popped = styles.pop();
        if (popped === 'heading') {
          endPara();
          const title = titleCase(heading.replace(/\s+/g, ' ').trim());
          heading = '';
          if (title) {
            section = { title, paras: [] };
            sections.push(section);
          }
        }
      } else if (/class="capolettera_piccolo"/.test(attrs)) {
        endPara();
        styles.push('heading');
      } else if (/class="rubrica"/.test(attrs)) styles.push('r');
      else if (name === 'em' || name === 'i' || /class="citazione"/.test(attrs)) styles.push('i');
      else styles.push(null);
    }
  }
  endPara();
  return sections.filter((s) => s.paras.length > 0);
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

/** The day page: its date ("Tuesday, 27 October 2026") and the name of the day. */
export function parseDayPage(html: string): { date: ISODate; day: string } | undefined {
  const start = html.indexOf('<div id="contenuto">');
  if (start < 0) return undefined;
  const lines = [...html.slice(start).matchAll(/<p>([^<]*)<\/p>/g)].map((m) => decodeEntities(m[1] ?? '').trim());
  const match = /^\w+,\s+(\d{1,2})\s+(\w+)\s+(\d{4})$/.exec(lines[0] ?? '');
  if (!match) return undefined;
  const month = MONTHS.indexOf((match[2] ?? '').toLowerCase()) + 1;
  if (month === 0) return undefined;
  const date = `${match[3]}-${String(month).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`;
  return { date, day: (lines[1] ?? '').replace(/\s+/g, ' ').trim() };
}

/* ---------- fetching ---------- */

async function request(path: string, cookie: string | undefined, body?: URLSearchParams): Promise<{ html: string; cookie?: string }> {
  let response: Response;
  try {
    response = await fetch(`${BASE}/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'en',
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      },
      body,
      redirect: 'follow',
      cache: 'no-store',
      signal: AbortSignal.timeout(STEP_TIMEOUT),
    });
  } catch (error) {
    throw new SourceError(`iBreviary did not answer (${(error as Error).name}).`);
  }
  if (!response.ok) throw new SourceError(`iBreviary answered ${response.status}.`);
  const session = response.headers.getSetCookie().map((c) => c.split(';')[0]).find((c) => c?.startsWith('PHPSESSID='));
  return { html: await response.text(), cookie: session };
}

/** One attempt: set the date, check it took, read the hour. */
async function attempt(date: ISODate, hour: HourId): Promise<{ day: string; sections: HourSection[] }> {
  const [year, month, day] = date.split('-').map(Number);
  const form = new URLSearchParams({ lang: 'en', giorno: String(day), mese: String(month), anno: String(year), ok: 'ok' });
  const opened = await request('opzioni.php', undefined, form);
  if (!opened.cookie) throw new SourceError('iBreviary did not start a session.');
  const index = parseDayPage((await request('breviario.php', opened.cookie)).html);
  if (!index) throw new SourceError('iBreviary’s day page could not be read.');
  // iBreviary falls back to another day (1 January 1970, or today) when the date does not take.
  if (index.date !== date) throw new SourceError(`iBreviary gave ${index.date} for ${date}.`);
  const sections = parseHourPage((await request(`breviario.php?s=${CODES[hour]}`, opened.cookie)).html);
  if (sections.length < 3) throw new SourceError('iBreviary’s page for the hour was incomplete.');
  return { day: index.day, sections };
}

/** Fetches an hour, trying up to three times: iBreviary is sometimes slow to answer. */
export async function fetchFromIbreviary(date: ISODate, hour: HourId): Promise<{ day: string; sections: HourSection[] }> {
  if (!HOURS.some((h) => h.id === hour)) throw new SourceError('Unknown hour.');
  let last: unknown;
  for (let i = 0; i < 3; i++) {
    try {
      return await attempt(date, hour);
    } catch (error) {
      last = error;
      if (!(error instanceof SourceError)) throw error;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw last;
}
