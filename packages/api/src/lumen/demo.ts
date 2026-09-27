/**
 * Scripted answers used when no model is configured (or the server cannot be
 * reached). They keep the app demonstrable offline and are always flagged
 * `demo: true` so the UI can say so.
 */
import type { Citation } from '../types.ts';
import type { LumenRequest } from './protocol.ts';

export interface ScriptedAnswer {
  content: string;
  citations: Citation[];
  followUps: string[];
}

const FORGIVENESS: ScriptedAnswer = {
  content: [
    'Forgiveness sits at the heart of the Gospel. Jesus tells Peter to forgive “seventy times seven” (Mt 18:22), meaning without limit.',
    '> “Forgive us our trespasses, as we forgive those who trespass against us.”\n> — CCC 2838–2845',
    "It doesn't mean the hurt wasn't real. It means choosing not to be ruled by it. Would you like a prayer for a forgiving heart?",
  ].join('\n\n'),
  citations: [
    { type: 'Scripture', reference: 'Matthew 18:21–22', description: 'Seventy times seven' },
    { type: 'Catechism', reference: 'CCC 2838–2845', description: 'On the fifth petition of the Our Father' },
    { type: 'Scripture', reference: 'Luke 23:34', description: 'Father, forgive them' },
  ],
  followUps: ['Yes, a prayer', 'A related passage', 'Saints who forgave'],
};

const FORGIVING_PRAYER: ScriptedAnswer = {
  content: [
    'Here is a short prayer you can make your own, slowly, naming the person if you are able.',
    '> Lord Jesus, you forgave from the Cross. Give me a heart like yours. I place this hurt in your hands; where I cannot yet forgive, make me willing to be made willing. Amen.',
    'Forgiveness is often a decision repeated many times before it becomes a feeling. If the wound is deep, it is worth bringing to a priest or a trusted spiritual director.',
  ].join('\n\n'),
  citations: [
    { type: 'Scripture', reference: 'Luke 23:34', description: 'Father, forgive them' },
    { type: 'Catechism', reference: 'CCC 2843', description: 'The heart that offers itself to the Holy Spirit' },
  ],
  followUps: ['A related passage', 'How to pray the Examen'],
};

const RELATED_PASSAGE: ScriptedAnswer = {
  content: [
    'Read the parable that follows Peter’s question: the servant forgiven an unpayable debt who then refuses to forgive a small one (Mt 18:23–35). Jesus sets our forgiving of others inside the far greater mercy we have already received.',
    'St. Paul draws the same line: we forgive one another as God in Christ forgave us (Eph 4:32).',
  ].join('\n\n'),
  citations: [
    { type: 'Scripture', reference: 'Matthew 18:23–35', description: 'The unforgiving servant' },
    { type: 'Scripture', reference: 'Ephesians 4:32', description: 'As God in Christ forgave you' },
  ],
  followUps: ['Yes, a prayer', 'Saints who forgave'],
};

const SAINTS_WHO_FORGAVE: ScriptedAnswer = {
  content: [
    'Two witnesses stand out. St. Stephen, the first martyr, died praying for those who stoned him (Acts 7:60). St. Maria Goretti forgave her attacker before she died, and he later repented.',
    'Neither treated the harm as small. Each entrusted justice to God and refused to let hatred have the last word.',
  ].join('\n\n'),
  citations: [
    { type: 'Scripture', reference: 'Acts 7:59–60', description: 'Stephen prays for his persecutors' },
    { type: 'Saint', reference: 'St. Maria Goretti', description: 'Martyr, canonized 1950' },
  ],
  followUps: ['Yes, a prayer', 'A related passage'],
};

const ARCHANGELS: ScriptedAnswer = {
  content: [
    'Scripture names three: Michael, who contends against evil (Rev 12:7); Gabriel, sent to Zechariah and to Mary (Lk 1:19, 26); and Raphael, companion and healer in the Book of Tobit (Tob 12:15). The Church keeps their feast together on 29 September.',
    '> “‘Angel’ is the name of their office, not of their nature.”\n> — St. Augustine, in CCC 329',
    'They are servants and messengers of God, and the whole life of the Church benefits from their help.',
  ].join('\n\n'),
  citations: [
    { type: 'Scripture', reference: 'Revelation 12:7–9', description: 'Michael and his angels' },
    { type: 'Scripture', reference: 'Luke 1:26–38', description: 'Gabriel is sent to Mary' },
    { type: 'Scripture', reference: 'Tobit 12:15', description: 'Raphael reveals himself' },
    { type: 'Catechism', reference: 'CCC 328–336', description: 'On the angels' },
  ],
  followUps: ['Guardian angels', 'A prayer to St. Michael'],
};

const EXAMEN: ScriptedAnswer = {
  content: [
    'The Examen is a short review of the day in God’s presence, taught by St. Ignatius of Loyola. It has five movements: give thanks; ask for light; review the day; ask pardon for what was amiss; resolve, with grace, for tomorrow.',
    '> Search me, O God, and know my heart.\n> — Psalm 139:23',
    'Ten minutes in the evening is enough. Go gently: the aim is to notice where God was at work, not to keep a ledger.',
  ].join('\n\n'),
  citations: [
    { type: 'Saint', reference: 'Spiritual Exercises, 43', description: 'St. Ignatius on the general examen' },
    { type: 'Scripture', reference: 'Psalm 139:23–24', description: 'Search me, O God' },
  ],
  followUps: ['Begin the Examen', 'What is Lectio Divina?'],
};

const PURGATORY: ScriptedAnswer = {
  content: [
    'The Church teaches that those who die in God’s grace and friendship, but still imperfectly purified, are assured of heaven and undergo a final purification first. That purification is what she calls Purgatory (CCC 1030–1031).',
    'It is why the Church prays for the dead, a practice already attested in 2 Maccabees, and offers the Eucharist for them (CCC 1032).',
  ].join('\n\n'),
  citations: [
    { type: 'Catechism', reference: 'CCC 1030–1032', description: 'The final purification' },
    { type: 'Scripture', reference: '2 Maccabees 12:46', description: 'Prayer for the dead' },
    { type: 'Scripture', reference: '1 Corinthians 3:15', description: 'Saved, but only as through fire' },
  ],
  followUps: ['Praying for the dead', 'What are indulgences?'],
};

const FALLBACK: ScriptedAnswer = {
  content: [
    'Lumen is running in demonstration mode, so only a few prepared answers are available. Once the assistant is connected, questions about Scripture, the Catechism, prayer and the saints will be answered here with sources.',
    'In the meantime, try one of the prepared topics below.',
  ].join('\n\n'),
  citations: [],
  followUps: ['Forgiveness when it’s hard', 'Who were the three archangels?', 'How to pray the Examen'],
};

const SCRIPTS: [RegExp, ScriptedAnswer][] = [
  [/yes, a prayer|prayer for a forgiving/i, FORGIVING_PRAYER],
  [/related passage/i, RELATED_PASSAGE],
  [/saints who forgave/i, SAINTS_WHO_FORGAVE],
  [/forgiv/i, FORGIVENESS],
  [/archangel|michael|gabriel|raphael/i, ARCHANGELS],
  [/examen/i, EXAMEN],
  [/purgatory/i, PURGATORY],
];

const EXPLAIN_JOHN_1_4: ScriptedAnswer = {
  content:
    '“Light” here is Christ himself, the Word entering a world in shadow. John deliberately echoes Genesis 1: a new creation begins.',
  citations: [
    { type: 'Scripture', reference: 'Genesis 1:3', description: 'Let there be light' },
    { type: 'Scripture', reference: 'John 8:12', description: 'I am the light' },
    { type: 'Scripture', reference: '1 John 1:5', description: 'God is light' },
  ],
  followUps: [],
};

const EXPLAIN_FALLBACK: ScriptedAnswer = {
  content:
    'Lumen is running in demonstration mode, so an explanation of this passage is not available yet. Once the assistant is connected, it will appear here with cross references.',
  citations: [],
  followUps: [],
};

export function scriptedAnswer(request: LumenRequest): ScriptedAnswer {
  if (request.mode === 'explain') {
    return /^John 1:[1-5]\b/.test(request.passage?.reference ?? '') ? EXPLAIN_JOHN_1_4 : EXPLAIN_FALLBACK;
  }
  const last = [...request.messages].reverse().find((m) => m.role === 'user')?.content ?? '';
  for (const [pattern, answer] of SCRIPTS) {
    if (pattern.test(last)) return answer;
  }
  return FALLBACK;
}

export const DEMO_ANSWERS = { FORGIVENESS, ARCHANGELS, EXAMEN, PURGATORY, EXPLAIN_JOHN_1_4 };

/** Breaks an answer into word-sized pieces so the demo streams like the real thing. */
export function chunkForStreaming(content: string): string[] {
  return content.match(/\S+\s*|\s+/g) ?? [];
}
