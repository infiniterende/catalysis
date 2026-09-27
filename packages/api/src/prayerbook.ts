/**
 * The prayer book: the Church's common prayers, set out so each can be read as
 * a page or prayed one step at a time in the guided player.
 *
 * The prayers are given in their traditional English wording. Meditations and
 * instructions are written for this app.
 */
import { BIBLE_BOOKS, type ChapterRef } from './bible/books.ts';
import { parseISODate } from './format.ts';
import type { GuidedPrayer, GuidedStep, ISODate, Tone } from './types.ts';

/* ---------- the common prayers, which the longer devotions are built from ---------- */

export const SIGN_OF_THE_CROSS = 'In the name of the Father, and of the Son, and of the Holy Spirit. Amen.';

export const OUR_FATHER =
  'Our Father, who art in heaven, hallowed be thy name; thy kingdom come, thy will be done on earth as it is in heaven.\n' +
  'Give us this day our daily bread, and forgive us our trespasses, as we forgive those who trespass against us; ' +
  'and lead us not into temptation, but deliver us from evil. Amen.';

export const HAIL_MARY =
  'Hail Mary, full of grace, the Lord is with thee. Blessed art thou among women, and blessed is the fruit of thy womb, Jesus.\n' +
  'Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen.';

export const GLORY_BE =
  'Glory be to the Father, and to the Son, and to the Holy Spirit, as it was in the beginning, is now, and ever shall be, world without end. Amen.';

export const APOSTLES_CREED =
  'I believe in God, the Father almighty, Creator of heaven and earth; and in Jesus Christ, his only Son, our Lord, ' +
  'who was conceived by the Holy Spirit, born of the Virgin Mary, suffered under Pontius Pilate, was crucified, died, and was buried.\n' +
  'He descended into hell; the third day he rose again from the dead; he ascended into heaven, and is seated at the right hand of God ' +
  'the Father almighty; from thence he shall come to judge the living and the dead.\n' +
  'I believe in the Holy Spirit, the holy catholic Church, the communion of saints, the forgiveness of sins, ' +
  'the resurrection of the body, and life everlasting. Amen.';

export const FATIMA_PRAYER =
  'O my Jesus, forgive us our sins, save us from the fires of hell, and lead all souls to heaven, especially those in most need of thy mercy.';

export const HAIL_HOLY_QUEEN =
  'Hail, holy Queen, Mother of mercy, our life, our sweetness, and our hope. To thee do we cry, poor banished children of Eve. ' +
  'To thee do we send up our sighs, mourning and weeping in this valley of tears.\n' +
  'Turn then, most gracious advocate, thine eyes of mercy toward us, and after this our exile show unto us the blessed fruit of thy womb, Jesus. ' +
  'O clement, O loving, O sweet Virgin Mary.\n' +
  'Pray for us, O holy Mother of God, that we may be made worthy of the promises of Christ.';

const ROSARY_CLOSING =
  'O God, whose only-begotten Son, by his life, death, and resurrection, has purchased for us the rewards of eternal life, ' +
  'grant, we beseech thee, that meditating upon these mysteries of the most holy Rosary of the Blessed Virgin Mary, ' +
  'we may imitate what they contain and obtain what they promise, through the same Christ our Lord. Amen.';

const ACT_OF_CONTRITION =
  'O my God, I am heartily sorry for having offended thee, and I detest all my sins because I dread the loss of heaven and the pains of hell; ' +
  'but most of all because they offend thee, my God, who art all good and deserving of all my love.\n' +
  'I firmly resolve, with the help of thy grace, to confess my sins, to do penance, and to amend my life. Amen.';

const COME_HOLY_SPIRIT =
  'Come, Holy Spirit, fill the hearts of your faithful and kindle in them the fire of your love.\n' +
  'Send forth your Spirit, and they shall be created. And you shall renew the face of the earth.\n' +
  'O God, who by the light of the Holy Spirit did instruct the hearts of the faithful, grant that by the same Holy Spirit ' +
  'we may be truly wise and ever enjoy his consolations. Through Christ our Lord. Amen.';

/* ---------- the Rosary ---------- */

type Mystery = { title: string; scripture: string; body: string };

const DECADE = 'On the large bead pray the Our Father; on each of the ten small beads, a Hail Mary. Close the decade with the Glory Be and the Fatima prayer, given here.';

const rosaryOpening: GuidedStep[] = [
  {
    title: 'Begin',
    body: 'Hold the crucifix. Make the Sign of the Cross and pray the Apostles’ Creed.',
    prayer: `${SIGN_OF_THE_CROSS}\n${APOSTLES_CREED}`,
  },
  {
    title: 'The first beads',
    body: 'Pray one Our Father, then three Hail Marys for faith, hope and charity, then the Glory Be.',
    prayer: `${OUR_FATHER}\n${HAIL_MARY}\n${GLORY_BE}`,
  },
];

const rosaryClosing: GuidedStep = {
  title: 'Hail, Holy Queen',
  body: 'After the fifth decade, close with the Hail, Holy Queen and the prayer of the Rosary.',
  prayer: `${HAIL_HOLY_QUEEN}\n${ROSARY_CLOSING}`,
  prompt: 'Which mystery stayed with you, and why?',
};

function rosary(id: string, title: string, days: string, mysteries: Mystery[]): GuidedPrayer {
  return {
    id,
    title,
    minutes: 20,
    summary: `Prayed on ${days}`,
    steps: [
      ...rosaryOpening,
      ...mysteries.map((m): GuidedStep => ({ title: m.title, scripture: m.scripture, body: `${m.body} ${DECADE}`, prayer: FATIMA_PRAYER })),
      rosaryClosing,
    ],
  };
}

const JOYFUL = rosary('g-rosary-joyful', 'The Joyful Mysteries', 'Mondays and Saturdays', [
  { title: 'The Annunciation', scripture: 'Luke 1:26-38', body: 'Gabriel brings God’s word to Mary, and she says yes. Pray for humility.' },
  { title: 'The Visitation', scripture: 'Luke 1:39-56', body: 'Mary hurries to Elizabeth, carrying Christ to her. Pray for love of neighbour.' },
  { title: 'The Nativity', scripture: 'Luke 2:1-20', body: 'Christ is born in Bethlehem and laid in a manger. Pray for poverty of spirit.' },
  { title: 'The Presentation', scripture: 'Luke 2:22-38', body: 'Mary and Joseph offer the child in the Temple. Pray for obedience.' },
  { title: 'The Finding in the Temple', scripture: 'Luke 2:41-52', body: 'After three days they find Jesus in his Father’s house. Pray for joy in finding him.' },
]);

const LUMINOUS = rosary('g-rosary-luminous', 'The Luminous Mysteries', 'Thursdays', [
  { title: 'The Baptism in the Jordan', scripture: 'Matthew 3:13-17', body: 'The Father’s voice names Jesus his beloved Son. Pray for openness to the Holy Spirit.' },
  { title: 'The Wedding at Cana', scripture: 'John 2:1-11', body: 'At Mary’s word, Jesus works his first sign. Pray to do whatever he tells you.' },
  { title: 'The Proclamation of the Kingdom', scripture: 'Mark 1:14-15', body: 'Jesus calls all to repent and believe the Gospel. Pray for conversion of heart.' },
  { title: 'The Transfiguration', scripture: 'Luke 9:28-36', body: 'On the mountain, his glory shines before the disciples. Pray for a desire for holiness.' },
  { title: 'The Institution of the Eucharist', scripture: 'Luke 22:14-20', body: 'At supper Jesus gives his Body and Blood. Pray for love of the Eucharist.' },
]);

const SORROWFUL = rosary('g-rosary-sorrowful', 'The Sorrowful Mysteries', 'Tuesdays and Fridays', [
  { title: 'The Agony in the Garden', scripture: 'Luke 22:39-46', body: 'Jesus prays in Gethsemane: not my will, but yours. Pray for sorrow for sin.' },
  { title: 'The Scourging at the Pillar', scripture: 'John 19:1', body: 'Jesus is bound and scourged. Pray for purity.' },
  { title: 'The Crowning with Thorns', scripture: 'Matthew 27:27-31', body: 'The soldiers mock the King of kings. Pray for courage.' },
  { title: 'The Carrying of the Cross', scripture: 'Luke 23:26-32', body: 'Jesus carries the cross to Calvary. Pray for patience.' },
  { title: 'The Crucifixion', scripture: 'Luke 23:33-46', body: 'Jesus dies on the cross for us. Pray for perseverance.' },
]);

const GLORIOUS = rosary('g-rosary', 'The Glorious Mysteries', 'Wednesdays and Sundays', [
  { title: 'The Resurrection', scripture: 'Matthew 28:1-10', body: 'Christ rises from the dead on the third day. Pray for the gift of faith.' },
  { title: 'The Ascension', scripture: 'Acts 1:6-11', body: 'Christ ascends to the Father. Pray for the gift of hope.' },
  { title: 'The Descent of the Holy Spirit', scripture: 'Acts 2:1-13', body: 'The Spirit comes upon Mary and the Apostles. Pray for the gifts of the Spirit.' },
  { title: 'The Assumption', scripture: 'Luke 1:46-55', body: 'Mary is taken up, body and soul, into heaven. Pray for the grace of a holy death.' },
  { title: 'The Coronation', scripture: 'Revelation 12:1', body: 'Mary is crowned Queen of heaven and earth. Pray for trust in her intercession.' },
]);

/** The mysteries traditionally prayed on a given day of the week. */
export function rosaryFor(date: ISODate): GuidedPrayer {
  const day = parseISODate(date).getDay();
  if (day === 1 || day === 6) return JOYFUL;
  if (day === 2 || day === 5) return SORROWFUL;
  if (day === 4) return LUMINOUS;
  return GLORIOUS;
}

/* ---------- the Stations of the Cross ---------- */

const ADORAMUS = 'We adore you, O Christ, and we bless you, because by your holy cross you have redeemed the world.';

const STATIONS: [title: string, meditation: string][] = [
  ['Jesus is condemned to death', 'Pilate washes his hands. Jesus, innocent, accepts the sentence in silence.'],
  ['Jesus takes up his cross', 'He receives the wood on his shoulders, and with it the weight of our sins.'],
  ['Jesus falls the first time', 'He falls beneath the cross and rises again. Ask for strength to begin again.'],
  ['Jesus meets his Mother', 'Their eyes meet on the road. Mary does not turn away from his suffering.'],
  ['Simon of Cyrene helps Jesus carry the cross', 'A stranger is pressed into service. Ask to carry another’s burden willingly.'],
  ['Veronica wipes the face of Jesus', 'One small act of kindness, against the crowd. Ask for the courage to be kind.'],
  ['Jesus falls the second time', 'Weaker now, he falls again, and again he rises.'],
  ['Jesus meets the women of Jerusalem', 'He turns from his own pain to console those who weep for him.'],
  ['Jesus falls the third time', 'Near the summit he falls once more. No fall is beyond his mercy.'],
  ['Jesus is stripped of his garments', 'Everything is taken from him. He holds nothing back.'],
  ['Jesus is nailed to the cross', 'He stretches out his hands and prays for those who crucify him.'],
  ['Jesus dies on the cross', 'Father, into your hands I commend my spirit. Kneel, and stay a moment in silence.'],
  ['Jesus is taken down from the cross', 'His body is laid in his Mother’s arms.'],
  ['Jesus is laid in the tomb', 'The stone is rolled across. The Church waits in hope for the third day.'],
];

/* ---------- the book ---------- */

export interface PrayerBookSection {
  id: string;
  title: string;
  description: string;
  tone: Tone;
  prayers: GuidedPrayer[];
}

const one = (id: string, title: string, summary: string, body: string, prayer: string, minutes = 1): GuidedPrayer => ({
  id, title, minutes, summary, steps: [{ title, body, prayer }],
});

export const PRAYER_BOOK: PrayerBookSection[] = [
  {
    id: 'essentials',
    title: 'The essentials',
    description: 'The prayers every Catholic knows by heart.',
    tone: 'a3',
    prayers: [
      one('g-sign', 'The Sign of the Cross', 'How every prayer begins', 'Trace the cross from forehead to chest, then shoulder to shoulder.', SIGN_OF_THE_CROSS),
      one('g-our-father', 'The Our Father', 'The prayer Jesus taught', 'Pray slowly, as the Lord taught his disciples.', OUR_FATHER),
      one('g-hail-mary', 'The Hail Mary', 'The angel’s greeting', 'Greet Our Lady in the words of Gabriel and Elizabeth, and ask her prayers.', HAIL_MARY),
      one('g-glory-be', 'The Glory Be', 'Praise of the Trinity', 'Give glory to the Father, the Son and the Holy Spirit.', GLORY_BE),
      one('g-creed', 'The Apostles’ Creed', 'What the Church believes', 'Profess the faith handed on from the Apostles.', APOSTLES_CREED, 2),
    ],
  },
  {
    id: 'daily',
    title: 'Through the day',
    description: 'Morning to night, a prayer for each hour.',
    tone: 'a2',
    prayers: [
      {
        id: 'g-offering',
        title: 'Morning Offering',
        minutes: 2,
        summary: 'Give the day to God',
        steps: [
          {
            title: 'Offer the day',
            body: 'Before anything else, offer to God your prayers, works, joys and sufferings of this day.',
            prayer:
              'O Jesus, through the Immaculate Heart of Mary, I offer you my prayers, works, joys, and sufferings of this day ' +
              'for all the intentions of your Sacred Heart, in union with the Holy Sacrifice of the Mass throughout the world, ' +
              'in reparation for my sins, for the intentions of all my relatives and friends, and in particular for the intentions of the Holy Father. Amen.',
          },
        ],
      },
      {
        id: 'g-angelus',
        title: 'The Angelus',
        minutes: 3,
        summary: 'At six, noon and six',
        steps: [
          { title: 'The Annunciation', body: 'Pray the verse and response, then a Hail Mary.', prayer: `The Angel of the Lord declared unto Mary.\nAnd she conceived of the Holy Spirit.\n${HAIL_MARY}` },
          { title: 'Mary’s yes', body: 'Pray the verse and response, then a Hail Mary.', prayer: `Behold the handmaid of the Lord.\nBe it done unto me according to thy word.\n${HAIL_MARY}` },
          { title: 'The Incarnation', body: 'Bow or genuflect at these words, then pray a Hail Mary.', prayer: `And the Word was made flesh.\nAnd dwelt among us.\n${HAIL_MARY}` },
          {
            title: 'Closing prayer',
            body: 'Ask Our Lady’s prayers, then pray the collect.',
            prayer:
              'Pray for us, O holy Mother of God.\nThat we may be made worthy of the promises of Christ.\n' +
              'Pour forth, we beseech thee, O Lord, thy grace into our hearts, that we, to whom the Incarnation of Christ, thy Son, ' +
              'was made known by the message of an angel, may by his Passion and Cross be brought to the glory of his Resurrection. ' +
              'Through the same Christ our Lord. Amen.',
          },
        ],
      },
      one(
        'g-regina-caeli', 'Regina Caeli', 'In place of the Angelus in Eastertide',
        'From Easter to Pentecost, pray this in place of the Angelus.',
        'Queen of Heaven, rejoice, alleluia.\nFor he whom you did merit to bear, alleluia.\nHas risen, as he said, alleluia.\nPray for us to God, alleluia.\n' +
          'Rejoice and be glad, O Virgin Mary, alleluia.\nFor the Lord has truly risen, alleluia.\n' +
          'O God, who gave joy to the world through the resurrection of thy Son, our Lord Jesus Christ, grant, we beseech thee, ' +
          'that through the intercession of the Virgin Mary, his Mother, we may obtain the joys of everlasting life. Through the same Christ our Lord. Amen.',
        2,
      ),
      {
        id: 'g-grace',
        title: 'Grace at meals',
        minutes: 1,
        summary: 'Before and after eating',
        steps: [
          { title: 'Before meals', body: 'Make the Sign of the Cross and ask God’s blessing.', prayer: 'Bless us, O Lord, and these thy gifts, which we are about to receive from thy bounty, through Christ our Lord. Amen.' },
          {
            title: 'After meals',
            body: 'Give thanks, and remember the dead.',
            prayer:
              'We give thee thanks for all thy benefits, O almighty God, who livest and reignest world without end. Amen.\n' +
              'May the souls of the faithful departed, through the mercy of God, rest in peace. Amen.',
          },
        ],
      },
      one(
        'g-guardian', 'Guardian Angel Prayer', 'For the angel at your side',
        'Entrust the day to the angel God has given you.',
        'Angel of God, my guardian dear, to whom God’s love commits me here, ever this day be at my side, to light and guard, to rule and guide. Amen.',
      ),
      one('g-contrition', 'Act of Contrition', 'Sorrow for sin', 'Pray it each night, and whenever you go to Confession.', ACT_OF_CONTRITION),
    ],
  },
  {
    id: 'rosary',
    title: 'The Rosary',
    description: 'Twenty mysteries of the life of Christ, prayed with Mary.',
    tone: 'a5',
    prayers: [JOYFUL, LUMINOUS, SORROWFUL, GLORIOUS, one('g-salve', 'Hail, Holy Queen', 'The Salve Regina', 'Pray it at the end of the Rosary, or on its own.', HAIL_HOLY_QUEEN, 2)],
  },
  {
    id: 'devotions',
    title: 'Devotions',
    description: 'Prayers the saints have loved.',
    tone: 'a4',
    prayers: [
      {
        id: 'g-chaplet',
        title: 'The Divine Mercy Chaplet',
        minutes: 8,
        summary: 'Prayed on rosary beads, often at three o’clock',
        steps: [
          { title: 'Opening', body: 'Make the Sign of the Cross, then pray one Our Father, one Hail Mary and the Apostles’ Creed.', prayer: `${SIGN_OF_THE_CROSS}\n${OUR_FATHER}\n${HAIL_MARY}\n${APOSTLES_CREED}` },
          {
            title: 'On the large beads',
            body: 'Begin each of the five decades with this prayer.',
            prayer: 'Eternal Father, I offer you the Body and Blood, Soul and Divinity of your dearly beloved Son, our Lord Jesus Christ, in atonement for our sins and those of the whole world.',
          },
          { title: 'On the small beads', body: 'Pray ten times in each decade.', prayer: 'For the sake of his sorrowful Passion, have mercy on us and on the whole world.' },
          {
            title: 'Closing',
            body: 'After five decades, pray three times.',
            prayer: 'Holy God, Holy Mighty One, Holy Immortal One, have mercy on us and on the whole world.\nJesus, I trust in you.',
            prompt: 'Who needs God’s mercy most in your life right now?',
          },
        ],
      },
      {
        id: 'g-stations',
        title: 'The Stations of the Cross',
        minutes: 25,
        summary: 'Fourteen stations on the way to Calvary',
        steps: [
          ...STATIONS.map(([title, meditation], i): GuidedStep => ({
            title: `${i + 1}. ${title}`,
            body: `${meditation} Then pray an Our Father, a Hail Mary and a Glory Be.`,
            prayer: ADORAMUS,
          })),
        ].map((step, i, all) => (i === all.length - 1 ? { ...step, prompt: 'At which station did you find yourself?' } : step)),
      },
      one(
        'g-memorare', 'The Memorare', 'Confidence in Our Lady’s help',
        'Bring your need to Mary with confidence.',
        'Remember, O most gracious Virgin Mary, that never was it known that anyone who fled to thy protection, implored thy help, ' +
          'or sought thy intercession was left unaided.\nInspired by this confidence, I fly unto thee, O Virgin of virgins, my Mother. ' +
          'To thee do I come, before thee I stand, sinful and sorrowful.\nO Mother of the Word Incarnate, despise not my petitions, ' +
          'but in thy mercy hear and answer me. Amen.',
        2,
      ),
      one(
        'g-michael', 'Prayer to St. Michael', 'For protection',
        'Ask the Archangel’s defence against evil.',
        'Saint Michael the Archangel, defend us in battle; be our protection against the wickedness and snares of the devil.\n' +
          'May God rebuke him, we humbly pray; and do thou, O Prince of the heavenly host, by the power of God, cast into hell Satan ' +
          'and all the evil spirits who prowl about the world seeking the ruin of souls. Amen.',
      ),
      one(
        'g-anima', 'Anima Christi', 'After Holy Communion',
        'Pray it in thanksgiving after receiving the Eucharist.',
        'Soul of Christ, sanctify me.\nBody of Christ, save me.\nBlood of Christ, inebriate me.\nWater from the side of Christ, wash me.\n' +
          'Passion of Christ, strengthen me.\nO good Jesus, hear me.\nWithin thy wounds hide me.\nSuffer me not to be separated from thee.\n' +
          'From the malicious enemy defend me.\nIn the hour of my death call me, and bid me come unto thee, ' +
          'that with thy saints I may praise thee for ever and ever. Amen.',
        2,
      ),
      one('g-holy-spirit', 'Come, Holy Spirit', 'Before study, work or a decision', 'Ask the Spirit’s light before you begin.', COME_HOLY_SPIRIT),
    ],
  },
  {
    id: 'ways',
    title: 'Ways of praying',
    description: 'Guided, step by step, with room for silence.',
    tone: 'a6',
    prayers: [
      {
        id: 'g-examen',
        title: 'The Examen of St. Ignatius',
        minutes: 10,
        summary: 'A review of the day, in five steps',
        steps: [
          { title: 'Give thanks', body: 'Become aware of God’s presence. Look back over the day and thank him for its gifts, large and small.' },
          { title: 'Ask for light', body: 'Ask the Holy Spirit to help you see the day as God sees it, with honesty and without fear.' },
          { title: 'Review the day', body: 'Walk through the day hour by hour. Where were you drawn toward God? Where did you turn away?' },
          { title: 'Ask pardon', body: 'Speak to the Lord as to a friend. Ask forgiveness for what was amiss and entrust it to his mercy.' },
          {
            title: 'Resolve for tomorrow',
            body: 'Look to the day ahead. Ask for the grace you will need, and close with an Our Father.',
            prayer: OUR_FATHER,
            prompt: 'Where did you notice God today, and what grace do you need tomorrow?',
          },
        ],
      },
      {
        id: 'g-lectio',
        title: 'Lectio Divina on Sunday’s Gospel',
        minutes: 15,
        summary: 'Praying with Scripture, in four movements',
        steps: [
          { title: 'Read', body: 'Read the passage slowly, aloud if you can. Notice the word or phrase that stays with you.' },
          { title: 'Meditate', body: 'Read it again. Turn the phrase over. What is the Lord saying to you through it today?' },
          { title: 'Pray', body: 'Answer him. Speak plainly about what the passage has stirred: thanks, sorrow, a request.' },
          { title: 'Contemplate', body: 'Rest in silence. Let go of words and simply remain in his presence.', prompt: 'Which word or phrase stayed with you, and what did you say in reply?' },
        ],
      },
      {
        id: 'g-confession',
        title: 'Preparing for Confession',
        minutes: 12,
        summary: 'An examination of conscience',
        steps: [
          { title: 'Ask for light', body: 'Place yourself before God, who loves you. Ask the Holy Spirit to show you your sins and his mercy together.', prayer: COME_HOLY_SPIRIT },
          { title: 'God', body: 'Have I prayed, and kept Sunday holy by going to Mass? Have I put anything before God: success, comfort, the opinion of others? Have I used his name carelessly?' },
          { title: 'Others', body: 'Have I honoured my parents and those I live with? Have I harmed anyone by anger, gossip, lies or neglect? Have I forgiven those who wronged me?' },
          { title: 'Myself', body: 'Have I been chaste in what I do, look at and say? Have I been honest in my work and studies? Have I envied others, or taken what is not mine?' },
          { title: 'Be sorry', body: 'Tell the Lord you are sorry, and resolve to change. Pray the Act of Contrition.', prayer: ACT_OF_CONTRITION },
          {
            title: 'Go to the priest',
            body: 'Begin with the Sign of the Cross and say how long it has been since your last confession. Confess your sins simply. Listen, accept your penance, and pray the Act of Contrition when asked.',
            prayer: 'Bless me, Father, for I have sinned.',
          },
        ],
      },
    ],
  },
];

export const GUIDED_PRAYERS: GuidedPrayer[] = PRAYER_BOOK.flatMap((section) => section.prayers);

export function findPrayer(id: string): { prayer: GuidedPrayer; section: PrayerBookSection } | undefined {
  for (const section of PRAYER_BOOK) {
    const prayer = section.prayers.find((p) => p.id === id);
    if (prayer) return { prayer, section };
  }
  return undefined;
}

/** Prayers whose title, summary or words contain the query. */
export function searchPrayerBook(query: string): GuidedPrayer[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return GUIDED_PRAYERS.filter((p) =>
    `${p.title} ${p.summary ?? ''} ${p.steps.map((s) => `${s.title} ${s.prayer ?? ''}`).join(' ')}`.toLowerCase().includes(q),
  );
}

/** The chapter a reference such as `Luke 1:26-38` or `1 Corinthians 13` points into. */
export function chapterOf(reference: string): ChapterRef | undefined {
  const match = /^\s*(.+?)\s+(\d+)(?::[\d\s,–-]+)?\s*$/.exec(reference);
  if (!match) return undefined;
  const name = match[1]?.toLowerCase();
  const book = BIBLE_BOOKS.find((b) => b.name.toLowerCase() === name);
  const chapter = Number(match[2]);
  if (!book || chapter < 1 || chapter > book.chapters) return undefined;
  return { bookId: book.id, chapter };
}
