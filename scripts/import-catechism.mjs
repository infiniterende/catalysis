#!/usr/bin/env node
/**
 * Imports the Catechism of the Catholic Church from
 * github.com/nossbigg/catechism-ccc-json (release v0.0.2, a scrape of the English
 * text on vatican.va) into packages/catechism:
 *
 *   toc.json          the table of contents, in reading order, with the paragraphs each part holds
 *   pages/<id>.json   one file per page of the table of contents: its paragraphs and footnotes
 *   search.json       every paragraph as plain text, for searching
 *   index.js          lazy loaders for the above
 *
 *   node scripts/import-catechism.mjs                download the pinned release
 *   node scripts/import-catechism.mjs --from <file>  read a local copy of ccc.json instead
 *
 * Corrections made on the way, each listed in the package README:
 * - §2267 is replaced with the text Pope Francis approved in 2018, which the source predates.
 * - Sentences the scrape left starting in lower case ("…in body and soul. the universe…") are capitalised.
 * - Scripture references in footnotes and in the text become links into the app's Bible reader.
 *
 * The English translation is © Libreria Editrice Vaticana (with the USCCB for the
 * United States). The source repository carries no licence. Obtain permission
 * before distributing an app that includes this text.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE = 'https://github.com/nossbigg/catechism-ccc-json/releases/download/v0.0.2/ccc.json';
const SHA256 = 'adf88ebe79be36ce56dc23554410fea1f5efe4d92d290d6d0634243bd9e030a7';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'packages/catechism');
const CHAPTERS = JSON.parse(await readFile(join(ROOT, 'packages/bible-nabre/chapters.json'), 'utf8'));

/* ---------- the 2018 revision of §2267 ---------- */

// Rescriptum "ex Audientia SS.mi", 1 August 2018 (vatican.va). Three paragraphs and one footnote.
const NEW_2267 = [
  'Recourse to the death penalty on the part of legitimate authority, following a fair trial, was long considered an appropriate response to the gravity of certain crimes and an acceptable, albeit extreme, means of safeguarding the common good.',
  'Today, however, there is an increasing awareness that the dignity of the person is not lost even after the commission of very serious crimes. In addition, a new understanding has emerged of the significance of penal sanctions imposed by the state. Lastly, more effective systems of detention have been developed, which ensure the due protection of citizens but, at the same time, do not definitively deprive the guilty of the possibility of redemption.',
  'Consequently, the Church teaches, in the light of the Gospel, that “the death penalty is inadmissible because it is an attack on the inviolability and dignity of the person”,',
  ' and she works with determination for its abolition worldwide.',
];
const NOTE_2267 = 'Francis, Address to Participants in the Meeting organized by the Pontifical Council for the Promotion of the New Evangelization, 11 October 2017: L’Osservatore Romano, 13 October 2017, 5.';

/* ---------- Scripture references ---------- */

/** Book codes in vatican.va's English Bible (the NAB) → USFM. */
const VATICAN_BOOKS = {
  '1JOH': '1JN', '1PET': '1PE', '2PET': '2PE', JAM: 'JAS', REV: 'REV', ACT: 'ACT', JOH: 'JHN', LUK: 'LUK',
  MAR: 'MRK', MAT: 'MAT', '1COR': '1CO', '1THE': '1TH', '1TIM': '1TI', '2COR': '2CO', '2THE': '2TH', '2TIM': '2TI',
  COL: 'COL', EPH: 'EPH', GAL: 'GAL', HEB: 'HEB', PHI: 'PHP', ROM: 'ROM', TIT: 'TIT', '1KIN': '1KI', '1SAM': '1SA',
  '2CHR': '2CH', '2KIN': '2KI', '2MAC': '2MA', '2SAM': '2SA', DEU: 'DEU', EXO: 'EXO', EZR: 'EZR', GEN: 'GEN',
  JDT: 'JDT', JOS: 'JOS', JUD: 'JDG', LEV: 'LEV', NEH: 'NEH', NUM: 'NUM', TOB: 'TOB', AMO: 'AMO', BAR: 'BAR',
  DAN: 'DAN', EZE: 'EZK', HOS: 'HOS', ISA: 'ISA', JER: 'JER', JOE: 'JOL', LAM: 'LAM', MAL: 'MAL', MIC: 'MIC',
  ZEC: 'ZEC', ZEP: 'ZEP', ECC: 'ECC', JOB: 'JOB', PRO: 'PRO', PSA: 'PSA', SIR: 'SIR', SON: 'SNG', WISD: 'WIS',
};

/** `{ b, c, v }` for a link into vatican.va's Bible, or undefined (Canon Law, unknown books, bad chapters). */
function scriptureFrom(link) {
  const match = /#[A-Z]+\.([0-9A-Z]+)\.(\d+)(?:\.(\d+))?$/.exec(link ?? '');
  if (!match) return undefined;
  const book = VATICAN_BOOKS[match[1]];
  const chapter = Number(match[2]);
  if (!book || !(chapter >= 1 && chapter <= (CHAPTERS[book] ?? 0))) return undefined;
  const verse = match[3] ? Number(match[3]) : undefined;
  return verse ? { b: book, c: chapter, v: verse } : { b: book, c: chapter };
}

/* ---------- text ---------- */

/** Words after which a full stop does not end a sentence. */
const ABBREVIATIONS = new Set([
  'cf', 'eg', 'ie', 'etc', 'ch', 'chap', 'art', 'arts', 'can', 'cann', 'nn', 'no', 'nos', 'vol', 'pp', 'p', 'sess',
  'op', 'cit', 'ibid', 'st', 'sts', 'al', 'viz', 'vs', 'lit', 'v', 'vv', 'ff', 'ps', 'pss',
]);

/**
 * The scrape lower-cased the first word of many sentences ("…body and soul. the
 * universe…"). Capitalises a lower-case word that follows a full stop, unless the
 * full stop belongs to an abbreviation.
 */
function capitaliseSentences(text) {
  return text.replace(/(\S+)\. ([a-z])/g, (whole, before, letter) => {
    const word = before.replace(/^[("“‘[]+|[)\]"”’]+$/g, '').toLowerCase();
    if (ABBREVIATIONS.has(word) || /^[a-z]$/.test(word) || /\.[a-z]$/.test(word)) return whole;
    return `${before}. ${letter.toUpperCase()}`;
  });
}

const tidy = (s) => s.replace(/\s+/g, ' ');

const SMALL = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'into', 'of', 'on', 'or', 'the', 'to', 'with', 'his', 'her', 'its', 'our', 'their']);
const ROMAN = /^[IVXLC]+[.:]?$/;

/** "MAN'S CAPACITY FOR GOD" → "Man's Capacity for God". Text already in mixed case is left alone. */
function titleCase(text) {
  // A title in mixed case keeps its case, except for words left in capitals ("…Who Trespass AGAINST US").
  if (/[a-z]/.test(text)) return text.replace(/\b[A-Z]{2,}\b/g, (word) => (ROMAN.test(word) ? word : titleCase(word)));
  let first = true;
  return text.split(/(\s+)/).map((piece) => {
    if (/^\s+$/.test(piece) || piece === '') return piece;
    const bare = piece.replace(/^[^A-Z]+|[^A-Z]+$/g, '');
    const lower = piece.toLowerCase();
    let out;
    if (ROMAN.test(bare) && bare.length <= 4 && bare !== 'I' && bare !== 'C' && bare !== 'L') out = piece;
    else if (bare === 'I') out = piece;
    else if (!first && SMALL.has(bare.toLowerCase())) out = lower;
    else out = lower.replace(/[a-z]/, (c) => c.toUpperCase());
    // After a hyphen or an opening quote, the next word starts again.
    out = out.replace(/([-–—"“(])([a-z])/g, (_, mark, c) => mark + c.toUpperCase());
    // A new phrase starts after a colon or dash, and after a heading number such as "I.".
    first = /[:–—-]$/.test(piece) || /^[IVX]+\.$/.test(piece);
    return out;
  }).join('');
}

const LABEL = /^(PART (?:ONE|TWO|THREE|FOUR)|SECTION (?:ONE|TWO)|CHAPTER (?:ONE|TWO|THREE|FOUR)|ARTICLE \d+|PARAGRAPH \d+|IN BRIEF)\b[:.]?\s*(.*)$/i;

/** Splits "CHAPTER ONE MAN'S CAPACITY FOR GOD" into a label and a title, both in title case. */
function splitTitle(text) {
  const clean = tidy(text).trim().replace(/\s+-\s+/g, ' – ');
  const match = LABEL.exec(clean);
  if (!match) return { title: titleCase(clean) };
  const label = titleCase(match[1].toUpperCase()).replace(/\b(One|Two|Three|Four)\b/, (w) => w);
  const rest = match[2].trim();
  if (!rest) return { title: label };
  return { label, title: titleCase(rest) };
}

/* ---------- pages ---------- */

const REFERENCE = /^(\s*)((?:[1-3I]{1,3} ?)?[A-Z][a-z]+\.? \d+(?::\d+(?:[-–]\d+)?(?:, ?\d+(?:[-–]\d+)?)*)?)/;

/** A paragraph of the source → `{ n?, q?, r }` with runs: string | { t, i?, b? } | { f } | { t, s }. */
function convertParagraph(paragraph, notesUsed) {
  const runs = [];
  let number;
  let linkNext;
  const push = (run) => {
    const last = runs[runs.length - 1];
    if (typeof run === 'string' && typeof last === 'string') runs[runs.length - 1] = last + run;
    else runs.push(run);
  };
  for (const element of paragraph.elements) {
    if (element.type === 'ref-ccc') number = element.ref_number;
    else if (element.type === 'ref') {
      push({ f: String(element.number) });
      notesUsed.add(String(element.number));
    } else if (element.type === 'ref-anchor') linkNext = scriptureFrom(element.link);
    else if (element.type === 'text') {
      let text = tidy(element.text);
      const style = element.attrs?.i ? { i: 1 } : element.attrs?.b && !element.attrs?.heavy_header ? { b: 1 } : null;
      if (linkNext) {
        const match = REFERENCE.exec(text);
        if (match) {
          if (match[1]) push(style ? { t: match[1], ...style } : match[1]);
          push({ t: match[2], s: linkNext, ...(style ?? {}) });
          text = text.slice(match[0].length);
        }
        linkNext = undefined;
      }
      if (text) push(style ? { t: text, ...style } : text);
    }
  }
  const squeeze = (t) => t.replace(/\s{2,}/g, ' ');
  const clean = runs
    .map((run) => (typeof run === 'string' ? squeeze(capitaliseSentences(run)) : 't' in run && !('s' in run) ? { ...run, t: squeeze(capitaliseSentences(run.t)) } : run))
    .filter((run) => typeof run !== 'string' || run.length > 0);
  if (typeof clean[0] === 'string') clean[0] = clean[0].replace(/^\s+/, '');
  const last = clean.length - 1;
  if (typeof clean[last] === 'string') clean[last] = clean[last].replace(/\s+$/, '');
  return { number, runs: clean };
}

const plain = (runs) => runs.map((r) => (typeof r === 'string' ? r : 'f' in r ? '' : r.t)).join('');

/** A short line that is neither numbered, footnoted nor punctuated: one of the Catechism's run-in subheadings. */
function looksLikeSubheading(block, paragraph) {
  if (block.n !== undefined || paragraph.attrs?.indent) return false;
  if (block.r.some((r) => typeof r !== 'string' && ('f' in r || 's' in r))) return false;
  const text = plain(block.r).trim();
  return text.length > 1 && text.length <= 70 && !/[.,;:?!"”’)]$/.test(text) && /^[A-Z"“]/.test(text);
}

function convertPage(id, node, title, notesSource) {
  const notesUsed = new Set();
  const blocks = [];
  node.paragraphs.forEach((paragraph, index) => {
    const elements = paragraph.elements.filter((e) => e.type !== 'spacer');
    if (elements.length === 0) return;
    const heavy = elements.some((e) => e.attrs?.heavy_header);
    if (heavy) {
      const text = tidy(elements.filter((e) => e.type === 'text').map((e) => e.text).join('')).trim();
      // The first heading of a page repeats its title.
      if (index === 0 || text.toUpperCase() === title.toUpperCase()) return;
      blocks.push({ h: splitTitle(text).title, l: /^IN BRIEF$/i.test(text) ? 1 : 2 });
      return;
    }
    const { number, runs } = convertParagraph({ ...paragraph, elements }, notesUsed);
    if (runs.length === 0) return;
    const block = { ...(number !== undefined ? { n: number } : {}), ...(paragraph.attrs?.indent ? { q: 1 } : {}), r: runs };
    if (!looksLikeSubheading(block, paragraph)) {
      blocks.push(block);
      return;
    }
    const text = plain(runs).trim();
    if (text.toUpperCase() === title.toUpperCase()) return;
    // A heading set in capitals is a section of the page; one in sentence case is a run-in subheading.
    if (/[a-z]/.test(text)) blocks.push({ h: text, l: 3 });
    else blocks.push({ h: splitTitle(text).title, l: /^IN BRIEF$/i.test(text) ? 1 : 2 });
  });

  // §2267, as revised in 2018: the old paragraph and its continuations give way to the new text.
  const at = blocks.findIndex((b) => b.n === 2267);
  if (at >= 0) {
    let end = at + 1;
    while (end < blocks.length && blocks[end].n === undefined && blocks[end].h === undefined) end++;
    const removed = blocks.slice(at, end);
    for (const block of removed) for (const run of block.r) if (typeof run !== 'string' && 'f' in run) notesUsed.delete(run.f);
    blocks.splice(at, end - at,
      { n: 2267, r: [NEW_2267[0]] },
      { r: [NEW_2267[1]] },
      { r: [NEW_2267[2], { f: '2267' }, NEW_2267[3]] },
    );
    notesUsed.add('2267');
  }

  const notes = {};
  for (const key of [...notesUsed].sort((a, b) => Number(a) - Number(b))) {
    if (key === '2267') {
      notes[key] = [{ t: NOTE_2267 }];
      continue;
    }
    const note = notesSource[key];
    if (!note) continue;
    notes[key] = note.refs.map((ref) => {
      const text = tidy(ref.text.replace(/⇒\s*/g, '')).trim();
      const scripture = scriptureFrom(ref.link);
      return scripture ? { t: text, s: scripture } : { t: text };
    }).filter((ref) => ref.t);
  }
  return { blocks, notes };
}

/* ---------- main ---------- */

async function source() {
  const from = process.argv.indexOf('--from');
  let raw;
  if (from > 0) raw = await readFile(process.argv[from + 1]);
  else {
    const response = await fetch(SOURCE, { redirect: 'follow' });
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    raw = Buffer.from(await response.arrayBuffer());
  }
  const digest = createHash('sha256').update(raw).digest('hex');
  if (digest !== SHA256) throw new Error(`Unexpected source file (sha256 ${digest}). Check it, then update SHA256.`);
  return JSON.parse(raw.toString('utf8'));
}

const ccc = await source();
const { toc_link_tree: tree, toc_nodes: tocNodes, page_nodes: pageNodes } = ccc;

// Walk the table of contents in reading order.
const order = [];
const walk = (nodes, depth, path) => {
  for (const { id, children } of nodes) {
    const { label, title } = splitTitle(tocNodes[id].text);
    order.push({ id, depth, label, title, path });
    walk(children, depth + 1, [...path, label ? `${label}: ${title}` : title]);
  }
};
walk(tree, 1, []);

await rm(join(OUT, 'pages'), { recursive: true, force: true });
await mkdir(join(OUT, 'pages'), { recursive: true });

const toc = [];
const search = [];
const seen = new Set();
let pageCount = 0;
for (const entry of order) {
  const node = pageNodes[entry.id];
  const pageId = node ? entry.id.replace('toc-', 'p') : undefined;
  let first;
  let last;
  if (node) {
    const { blocks, notes } = convertPage(pageId, node, tocNodes[entry.id].text, node.footnotes ?? {});
    const numbers = blocks.filter((b) => b.n !== undefined).map((b) => b.n);
    first = numbers[0];
    last = numbers[numbers.length - 1];
    for (const n of numbers) {
      if (seen.has(n)) throw new Error(`§${n} appears twice`);
      seen.add(n);
    }
    // Search text: each numbered paragraph with the unnumbered ones that follow it.
    let current;
    for (const block of blocks) {
      if (block.h !== undefined) continue;
      if (block.n !== undefined) {
        current = [block.n, ''];
        search.push(current);
      }
      if (current) current[1] = `${current[1]} ${plain(block.r)}`.trim();
    }
    const page = { id: pageId, label: entry.label, title: entry.title, path: entry.path, blocks, notes };
    await writeFile(join(OUT, 'pages', `${pageId}.json`), JSON.stringify(page));
    pageCount++;
  }
  toc.push({
    id: entry.id.replace('toc-', 't'),
    depth: entry.depth,
    ...(entry.label ? { label: entry.label } : {}),
    title: entry.title,
    ...(pageId ? { page: pageId } : {}),
    ...(first !== undefined ? { first, last } : {}),
  });
}

// A heading without a page of its own spans the paragraphs of the pages beneath it.
for (let i = toc.length - 1; i >= 0; i--) {
  const node = toc[i];
  if (node.first !== undefined) continue;
  let first;
  let last;
  for (let j = i + 1; j < toc.length && toc[j].depth > node.depth; j++) {
    if (toc[j].first === undefined) continue;
    first ??= toc[j].first;
    last = toc[j].last;
  }
  if (first !== undefined) Object.assign(node, { first, last });
}

// Every entry also records where everything beneath it ends, for showing its range.
for (let i = 0; i < toc.length; i++) {
  const node = toc[i];
  let end = node.last;
  for (let j = i + 1; j < toc.length && toc[j].depth > node.depth; j++) {
    if (toc[j].last !== undefined && (end === undefined || toc[j].last > end)) end = toc[j].last;
  }
  if (end !== undefined && end !== node.last) node.end = end;
}

const missing = [];
for (let n = 1; n <= 2865; n++) if (!seen.has(n)) missing.push(n);
if (missing.length) throw new Error(`Missing paragraphs: ${missing.slice(0, 20).join(', ')}`);

await writeFile(join(OUT, 'toc.json'), JSON.stringify(toc));
await writeFile(join(OUT, 'search.json'), JSON.stringify(search.sort((a, b) => a[0] - b[0])));

const pages = toc.filter((t) => t.page);
await writeFile(join(OUT, 'index.js'), `// GENERATED by scripts/import-catechism.mjs — do not edit.
const PAGES = {
${pages.map((t) => `  '${t.page}': () => import('./pages/${t.page}.json'),`).join('\n')}
};

const unwrap = (module) => module.default ?? module;

/** The table of contents, in reading order. */
export async function loadCatechismToc() {
  return unwrap(await import('./toc.json'));
}

/** One page of the Catechism. Resolves to \`undefined\` for an unknown id. */
export async function loadCatechismPage(id) {
  const load = PAGES[id];
  return load ? unwrap(await load()) : undefined;
}

/** Every paragraph as \`[number, plain text]\`, for searching. About 1.4 MB: load it only to search. */
export async function loadCatechismSearch() {
  return unwrap(await import('./search.json'));
}
`);

console.log(`${toc.length} headings, ${pageCount} pages, ${seen.size} paragraphs, ${search.length} searchable.`);
