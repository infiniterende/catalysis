#!/usr/bin/env node
/**
 * Imports the NABRE text from github.com/nirmalben/bible-nabre-json-dataset into
 * packages/bible-nabre/books, one compact JSON file per book, keyed by USFM code.
 *
 *   node scripts/import-nabre.mjs                 download from GitHub (pinned commit)
 *   node scripts/import-nabre.mjs --from <dir>    read a local clone instead
 *   node scripts/import-nabre.mjs --report        also print what was treated as a heading
 *
 * The source is a scrape of one verse at a time, so section headings arrive fused
 * to the verse that follows them ("Chapter 5 - The Sermon on the Mount. When he
 * saw the crowds…"). This script lifts them out into `h`, so the reader can set
 * them as headings: `h` before a verse, `m` inside one. Nothing is discarded
 * except the bare "Chapter N" / "Psalm N" markers, and when in doubt words stay
 * in the verse.
 *
 * The NABRE is under copyright (Confraternity of Christian Doctrine). The source
 * repository's MIT licence covers its script, not the translation. Obtain
 * permission before distributing an app that includes this text.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const COMMIT = '768abdb913345b56bfc2e1a963634c9723d06719';
const RAW = `https://raw.githubusercontent.com/nirmalben/bible-nabre-json-dataset/${COMMIT}/generated_data/books`;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'packages/bible-nabre/books');

/** USFM code → file name in the source repository. */
const BOOKS = {
  GEN: 'Genesis', EXO: 'Exodus', LEV: 'Leviticus', NUM: 'Numbers', DEU: 'Deuteronomy', JOS: 'Joshua',
  JDG: 'Judges', RUT: 'Ruth', '1SA': '1Samuel', '2SA': '2Samuel', '1KI': '1Kings', '2KI': '2Kings',
  '1CH': '1Chronicles', '2CH': '2Chronicles', EZR: 'Ezra', NEH: 'Nehemiah', TOB: 'Tobit', JDT: 'Judith',
  EST: 'Esther', '1MA': '1Maccabees', '2MA': '2Maccabees', JOB: 'Job', PSA: 'Psalms', PRO: 'Proverbs',
  ECC: 'Ecclesiastes', SNG: 'SongofSongs', WIS: 'Wisdom', SIR: 'Sirach', ISA: 'Isaiah', JER: 'Jeremiah',
  LAM: 'Lamentations', BAR: 'Baruch', EZK: 'Ezekiel', DAN: 'Daniel', HOS: 'Hosea', JOL: 'Joel', AMO: 'Amos',
  OBA: 'Obadiah', JON: 'Jonah', MIC: 'Micah', NAM: 'Nahum', HAB: 'Habakkuk', ZEP: 'Zephaniah', HAG: 'Haggai',
  ZEC: 'Zechariah', MAL: 'Malachi', MAT: 'Matthew', MRK: 'Mark', LUK: 'Luke', JHN: 'John', ACT: 'Acts',
  ROM: 'Romans', '1CO': '1Corinthians', '2CO': '2Corinthians', GAL: 'Galatians', EPH: 'Ephesians',
  PHP: 'Philippians', COL: 'Colossians', '1TH': '1Thessalonians', '2TH': '2Thessalonians', '1TI': '1Timothy',
  '2TI': '2Timothy', TIT: 'Titus', PHM: 'Philemon', HEB: 'Hebrews', JAS: 'James', '1PE': '1Peter',
  '2PE': '2Peter', '1JN': '1John', '2JN': '2John', '3JN': '3John', JUD: 'Jude', REV: 'Revelation',
};

const SEPARATOR = ' - ';
/** Chapter markers, including Esther's lettered Greek additions and "(Chapter 3)". */
const MARKER = /\(?\b(?:Chapter|Psalm) (?:\d+|[A-F])\b\)?/;
/** Stanza markers in the Psalms and Lamentations: I, II, A, B, Aleph, Beth… */
const STANZA = /^(?:[IVX]+|[A-Z]|Aleph|Beth|Gimel|Daleth|He|Waw|Zayin|Heth|Teth|Yodh|Kaph|Lamedh|Mem|Nun|Samekh|Ayin|Pe|Sadhe|Qoph|Resh|Shin|Sin|Taw)$/;
const SMALL = new Set([
  'a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'into', 'of', 'on', 'or', 'over', 'the', 'to',
  'with', 'his', 'her', 'its', 'their', 'upon', 'against', 'before', 'after', 'among', 'through', 'toward',
  'between', 'under', 'within', 'without', 'who', 'that',
]);
/** One-word sentences that are scripture, however much they look like a title. */
const NOT_HEADINGS = new Set(['Amen', 'Selah', 'Hallelujah']);

const tidy = (s) => s.replace(/\s+/g, ' ').trim();
const hasWord = (s) => /[\p{L}\p{N}]/u.test(s);
const sentences = (s) => tidy(s).split(/(?<=[.!?”’\]])\s+/).filter(Boolean);

/** NABRE sets its headings in title case: every significant word is capitalised. */
function isTitle(phrase) {
  const words = phrase.split(' ').filter(Boolean);
  if (words.length === 0 || words.length > 18) return false;
  if (words.length === 1 && NOT_HEADINGS.has(words[0].replace(/[^\p{L}]/gu, ''))) return false;
  if (/[“”‘"]/.test(phrase)) return false;
  return words.every((word, i) => {
    const bare = word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
    if (!bare) return true;
    if (i > 0 && SMALL.has(bare.toLowerCase())) return true;
    return /^[\p{Lu}\p{N}]/u.test(bare);
  });
}

/** Splits "…forever and ever. Amen. IV. Advice to the Persecuted" into its text and the heading that trails it. */
function splitTrailingHeading(part) {
  const pieces = sentences(part);
  if (pieces.length === 0) return { text: '', heading: '' };
  const last = pieces[pieces.length - 1].replace(/[.:]$/, '');
  let start = pieces.length;
  if (STANZA.test(last)) {
    start = pieces.length - 1;
  } else {
    while (start > 0 && isTitle(pieces.slice(start - 1).join(' '))) start -= 1;
    while (start < pieces.length && NOT_HEADINGS.has(pieces[start].replace(/[^\p{L}]/gu, ''))) start += 1;
  }
  return { text: pieces.slice(0, start).join(' '), heading: pieces.slice(start).join(' ') };
}

/**
 * Returns the verse's text, the headings that stand before it (`before`), any
 * that fall inside it (`breaks`, by character offset into `text`), and any that
 * trail it and so belong to the verse that follows (`after`).
 */
export function parseVerse(raw) {
  const parts = tidy(raw).split(SEPARATOR);
  if (parts.length === 1) return { text: parts[0], before: [], breaks: [], after: [] };

  // An ordered run of text and headings, as they appear in the source.
  const run = [];
  const push = (kind, value) => {
    const clean = tidy(kind === 'heading' ? value.replace(/\.$/, '') : value);
    if (!clean || (kind === 'heading' && !hasWord(clean))) return;
    const previous = run[run.length - 1];
    if (kind === 'text' && previous?.kind === 'text') previous.value += ` ${clean}`;
    else run.push({ kind, value: clean });
  };

  const final = parts.pop();
  for (const part of parts) {
    const marker = MARKER.exec(part);
    const lead = marker ? part.slice(0, marker.index) : part;
    const tail = marker ? part.slice(marker.index + marker[0].length) : '';
    const { text, heading } = splitTrailingHeading(lead);
    const opening = sentences(text);
    const first = opening[0]?.replace(/\.$/, '') ?? '';
    if (run[run.length - 1]?.kind === 'heading' && opening.length > 1 && isTitle(first)) {
      // The part opens with a sub-heading of its own: "Dream of Mordecai. In the second year…"
      push('heading', first);
      push('text', opening.slice(1).join(' '));
    } else {
      push('text', text);
    }
    push('heading', heading);
    if (tail) push(isTitle(tidy(tail)) || STANZA.test(tidy(tail)) ? 'heading' : 'text', tail);
  }

  const hasText = run.some((item) => item.kind === 'text');
  const whole = tidy(final).replace(/\.$/, '');
  if (hasText && isTitle(whole)) {
    push('heading', final);
  } else {
    // A sub-heading can follow the separator: "The Sermon on the Mount. When he saw…"
    const stop = final.indexOf('. ');
    const lead = stop > 0 ? final.slice(0, stop) : '';
    if (lead && isTitle(lead)) {
      push('heading', lead);
      push('text', final.slice(stop + 2));
    } else {
      // A stanza numeral can be fused to the first word: "IThe LORD is my light…"
      const fused = /^([IVX]{1,4})(?=[A-Z][a-z])/.exec(final);
      const lettered = /^[A-Z]$/.test(run[run.length - 1]?.value ?? '') && /^([IVX]{1,4}) (?=[A-Z][a-z])/.exec(final);
      const stanza = fused ?? (lettered || null);
      if (stanza) {
        push('heading', stanza[1]);
        push('text', final.slice(stanza[0].length));
      } else {
        push('text', final);
      }
    }
  }

  const before = [];
  const breaks = [];
  const after = [];
  let text = '';
  run.forEach((item, i) => {
    if (item.kind === 'text') {
      text = text ? `${text} ${item.value}` : item.value;
    } else if (!text) {
      before.push(item.value);
    } else if (run.slice(i + 1).some((next) => next.kind === 'text')) {
      const open = breaks[breaks.length - 1];
      if (open && open.at === text.length + 1) open.h.push(item.value);
      else breaks.push({ at: text.length + 1, h: [item.value] });
    } else {
      after.push(item.value);
    }
  });
  return { text, before, breaks, after };
}

async function load(name, from) {
  if (from) return JSON.parse(await readFile(join(from, 'generated_data/books', `${name}.json`), 'utf8'));
  const response = await fetch(`${RAW}/${name}.json`);
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  return response.json();
}

async function main() {
  const args = process.argv.slice(2);
  const from = args.includes('--from') ? args[args.indexOf('--from') + 1] : undefined;
  const report = args.includes('--report');

  await mkdir(OUT, { recursive: true });
  const index = {};
  let verses = 0;
  let lifted = 0;

  for (const [id, name] of Object.entries(BOOKS)) {
    const source = await load(name, from);
    const chapters = [...source.chapters]
      .sort((a, b) => a.chapter - b.chapter)
      .map((chapter, i) => {
        if (chapter.chapter !== i + 1) throw new Error(`${name}: chapter ${i + 1} is missing`);
        let carried = [];
        return chapter.verses.map((verse) => {
          const parsed = parseVerse(verse.text);
          if (!parsed.text) throw new Error(`${name} ${chapter.chapter}:${verse.verse} came out empty`);
          verses += 1;
          // A heading that trails one verse introduces the next.
          const headings = [...carried.filter((h) => !parsed.before.includes(h)), ...parsed.before];
          carried = parsed.after;
          const out = { n: verse.verse, t: parsed.text };
          if (headings.length > 0) out.h = headings;
          if (parsed.breaks.length > 0) out.m = parsed.breaks;
          if (out.h || out.m) {
            lifted += 1;
            if (report) {
              const mid = parsed.breaks.map((b) => `@${b.at} ${b.h.join(' | ')}`).join('; ');
              console.log(`${id} ${chapter.chapter}:${verse.verse}  [${headings.join(' | ')}]${mid ? ` {${mid}}` : ''}  ${parsed.text.slice(0, 60)}`);
            }
          }
          return out;
        });
      });
    index[id] = chapters.length;
    await writeFile(join(OUT, `${id}.json`), `${JSON.stringify({ id, chapters })}\n`);
  }

  await writeFile(join(OUT, '..', 'chapters.json'), `${JSON.stringify(index, null, 2)}\n`);

  // One lazy import per book, so bundlers load a book only when it is opened.
  const loaders = Object.keys(index).map((id) => `  '${id}': () => import('./books/${id}.json'),`).join('\n');
  await writeFile(
    join(OUT, '..', 'index.js'),
    `// GENERATED by scripts/import-nabre.mjs — do not edit.\nconst LOADERS = {\n${loaders}\n};\n\n` +
      `export const NABRE_CHAPTERS = ${JSON.stringify(index)};\n\n` +
      `export async function loadNabreBook(id) {\n  const load = LOADERS[id];\n  if (!load) return undefined;\n` +
      `  const book = await load();\n  return book.default ?? book;\n}\n`,
  );
  console.error(`Imported ${Object.keys(index).length} books, ${verses} verses; headings lifted from ${lifted}.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
