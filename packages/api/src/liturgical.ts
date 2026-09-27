/**
 * Liturgical calendar — General Roman Calendar as kept in the United States
 * (Epiphany and Corpus Christi on Sunday; Ascension on Thursday, as in the
 * Province of New York). Covers the seasons, movable feasts, and the fixed
 * solemnities, feasts and obligatory memorials, plus a few optional memorials.
 *
 * It is computed locally so both apps work offline. Swap in a diocesan calendar
 * source behind `getLiturgicalDay` if local propers are needed.
 */
import { addDays, daysBetween, ordinalSuffix, ordinalWords, toISODate, WEEKDAYS } from './format.ts';
import type { ISODate, LiturgicalDay, LiturgicalRank, LiturgicalSeason } from './types.ts';

type Kind = 'S' | 'FL' | 'F' | 'M' | 'O';

/** `[kind, name, short name]` keyed by `MM-DD`. FL = feast of the Lord. */
const FIXED: Record<string, [Kind, string, string]> = {
  '01-01': ['S', 'Mary, the Holy Mother of God', 'Mary, Mother of God'],
  '01-02': ['M', 'Sts. Basil the Great & Gregory Nazianzen', 'Sts. Basil & Gregory'],
  '01-04': ['M', 'St. Elizabeth Ann Seton', 'St. Elizabeth Ann Seton'],
  '01-05': ['M', 'St. John Neumann', 'St. John Neumann'],
  '01-17': ['M', 'St. Anthony, Abbot', 'St. Anthony, Abbot'],
  '01-21': ['M', 'St. Agnes', 'St. Agnes'],
  '01-24': ['M', 'St. Francis de Sales', 'St. Francis de Sales'],
  '01-25': ['F', 'the Conversion of St. Paul', 'Conversion of St. Paul'],
  '01-26': ['M', 'Sts. Timothy & Titus', 'Sts. Timothy & Titus'],
  '01-28': ['M', 'St. Thomas Aquinas', 'St. Thomas Aquinas'],
  '01-31': ['M', 'St. John Bosco', 'St. John Bosco'],
  '02-02': ['FL', 'the Presentation of the Lord', 'The Presentation'],
  '02-05': ['M', 'St. Agatha', 'St. Agatha'],
  '02-06': ['M', 'St. Paul Miki & Companions', 'St. Paul Miki'],
  '02-10': ['M', 'St. Scholastica', 'St. Scholastica'],
  '02-14': ['M', 'Sts. Cyril & Methodius', 'Sts. Cyril & Methodius'],
  '02-22': ['F', 'the Chair of St. Peter', 'Chair of St. Peter'],
  '02-23': ['M', 'St. Polycarp', 'St. Polycarp'],
  '03-07': ['M', 'Sts. Perpetua & Felicity', 'Sts. Perpetua & Felicity'],
  '03-17': ['O', 'St. Patrick', 'St. Patrick'],
  '03-19': ['S', 'St. Joseph, Spouse of the Blessed Virgin Mary', 'St. Joseph'],
  '03-25': ['S', 'the Annunciation of the Lord', 'The Annunciation'],
  '04-25': ['F', 'St. Mark, Evangelist', 'St. Mark'],
  '04-29': ['M', 'St. Catherine of Siena', 'St. Catherine of Siena'],
  '05-01': ['O', 'St. Joseph the Worker', 'St. Joseph the Worker'],
  '05-02': ['M', 'St. Athanasius', 'St. Athanasius'],
  '05-03': ['F', 'Sts. Philip & James, Apostles', 'Sts. Philip & James'],
  '05-14': ['F', 'St. Matthias, Apostle', 'St. Matthias'],
  '05-26': ['M', 'St. Philip Neri', 'St. Philip Neri'],
  '05-31': ['F', 'the Visitation of the Blessed Virgin Mary', 'The Visitation'],
  '06-01': ['M', 'St. Justin, Martyr', 'St. Justin'],
  '06-03': ['M', 'St. Charles Lwanga & Companions', 'St. Charles Lwanga'],
  '06-05': ['M', 'St. Boniface', 'St. Boniface'],
  '06-11': ['M', 'St. Barnabas, Apostle', 'St. Barnabas'],
  '06-13': ['M', 'St. Anthony of Padua', 'St. Anthony of Padua'],
  '06-21': ['M', 'St. Aloysius Gonzaga', 'St. Aloysius Gonzaga'],
  '06-24': ['S', 'the Nativity of St. John the Baptist', 'Nativity of John the Baptist'],
  '06-28': ['M', 'St. Irenaeus', 'St. Irenaeus'],
  '06-29': ['S', 'Sts. Peter & Paul, Apostles', 'Sts. Peter & Paul'],
  '07-03': ['F', 'St. Thomas, Apostle', 'St. Thomas'],
  '07-11': ['M', 'St. Benedict', 'St. Benedict'],
  '07-14': ['M', 'St. Kateri Tekakwitha', 'St. Kateri Tekakwitha'],
  '07-15': ['M', 'St. Bonaventure', 'St. Bonaventure'],
  '07-22': ['F', 'St. Mary Magdalene', 'St. Mary Magdalene'],
  '07-25': ['F', 'St. James, Apostle', 'St. James'],
  '07-26': ['M', 'Sts. Joachim & Anne', 'Sts. Joachim & Anne'],
  '07-29': ['M', 'Sts. Martha, Mary & Lazarus', 'Sts. Martha, Mary & Lazarus'],
  '07-31': ['M', 'St. Ignatius of Loyola', 'St. Ignatius of Loyola'],
  '08-01': ['M', 'St. Alphonsus Liguori', 'St. Alphonsus Liguori'],
  '08-04': ['M', 'St. John Vianney', 'St. John Vianney'],
  '08-06': ['FL', 'the Transfiguration of the Lord', 'The Transfiguration'],
  '08-08': ['M', 'St. Dominic', 'St. Dominic'],
  '08-10': ['F', 'St. Lawrence, Deacon & Martyr', 'St. Lawrence'],
  '08-11': ['M', 'St. Clare', 'St. Clare'],
  '08-14': ['M', 'St. Maximilian Kolbe', 'St. Maximilian Kolbe'],
  '08-15': ['S', 'the Assumption of the Blessed Virgin Mary', 'The Assumption'],
  '08-20': ['M', 'St. Bernard', 'St. Bernard'],
  '08-21': ['M', 'St. Pius X', 'St. Pius X'],
  '08-22': ['M', 'the Queenship of the Blessed Virgin Mary', 'Queenship of Mary'],
  '08-24': ['F', 'St. Bartholomew, Apostle', 'St. Bartholomew'],
  '08-27': ['M', 'St. Monica', 'St. Monica'],
  '08-28': ['M', 'St. Augustine', 'St. Augustine'],
  '08-29': ['M', 'the Passion of St. John the Baptist', 'Passion of John the Baptist'],
  '09-03': ['M', 'St. Gregory the Great', 'St. Gregory the Great'],
  '09-08': ['F', 'the Nativity of the Blessed Virgin Mary', 'Nativity of Mary'],
  '09-09': ['M', 'St. Peter Claver', 'St. Peter Claver'],
  '09-13': ['M', 'St. John Chrysostom', 'St. John Chrysostom'],
  '09-14': ['FL', 'the Exaltation of the Holy Cross', 'Exaltation of the Cross'],
  '09-15': ['M', 'Our Lady of Sorrows', 'Our Lady of Sorrows'],
  '09-16': ['M', 'Sts. Cornelius & Cyprian', 'Sts. Cornelius & Cyprian'],
  '09-20': ['M', 'Sts. Andrew Kim Tae-gŏn, Paul Chŏng Ha-sang & Companions', 'Korean Martyrs'],
  '09-21': ['F', 'St. Matthew, Apostle & Evangelist', 'St. Matthew'],
  '09-23': ['M', 'St. Pius of Pietrelcina', 'St. Pio'],
  '09-26': ['O', 'Sts. Cosmas & Damian', 'Sts. Cosmas & Damian'],
  '09-27': ['M', 'St. Vincent de Paul', 'St. Vincent de Paul'],
  '09-29': ['F', 'Sts. Michael, Gabriel & Raphael', 'The Archangels'],
  '09-30': ['M', 'St. Jerome', 'St. Jerome'],
  '10-01': ['M', 'St. Thérèse of the Child Jesus', 'St. Thérèse'],
  '10-02': ['M', 'the Holy Guardian Angels', 'Guardian Angels'],
  '10-04': ['M', 'St. Francis of Assisi', 'St. Francis of Assisi'],
  '10-07': ['M', 'Our Lady of the Rosary', 'Our Lady of the Rosary'],
  '10-15': ['M', 'St. Teresa of Jesus', 'St. Teresa of Ávila'],
  '10-17': ['M', 'St. Ignatius of Antioch', 'St. Ignatius of Antioch'],
  '10-18': ['F', 'St. Luke, Evangelist', 'St. Luke'],
  '10-19': ['M', 'Sts. John de Brébeuf, Isaac Jogues & Companions', 'North American Martyrs'],
  '10-22': ['O', 'St. John Paul II', 'St. John Paul II'],
  '10-28': ['F', 'Sts. Simon & Jude, Apostles', 'Sts. Simon & Jude'],
  '11-01': ['S', 'All Saints', 'All Saints'],
  '11-02': ['S', 'All the Faithful Departed', 'All Souls'],
  '11-04': ['M', 'St. Charles Borromeo', 'St. Charles Borromeo'],
  '11-09': ['FL', 'the Dedication of the Lateran Basilica', 'Lateran Basilica'],
  '11-10': ['M', 'St. Leo the Great', 'St. Leo the Great'],
  '11-11': ['M', 'St. Martin of Tours', 'St. Martin of Tours'],
  '11-12': ['M', 'St. Josaphat', 'St. Josaphat'],
  '11-13': ['M', 'St. Frances Xavier Cabrini', 'St. Frances Cabrini'],
  '11-17': ['M', 'St. Elizabeth of Hungary', 'St. Elizabeth of Hungary'],
  '11-21': ['M', 'the Presentation of the Blessed Virgin Mary', 'Presentation of Mary'],
  '11-22': ['M', 'St. Cecilia', 'St. Cecilia'],
  '11-24': ['M', 'St. Andrew Dũng-Lạc & Companions', 'Vietnamese Martyrs'],
  '11-30': ['F', 'St. Andrew, Apostle', 'St. Andrew'],
  '12-03': ['M', 'St. Francis Xavier', 'St. Francis Xavier'],
  '12-07': ['M', 'St. Ambrose', 'St. Ambrose'],
  '12-08': ['S', 'the Immaculate Conception of the Blessed Virgin Mary', 'Immaculate Conception'],
  '12-12': ['F', 'Our Lady of Guadalupe', 'Our Lady of Guadalupe'],
  '12-13': ['M', 'St. Lucy', 'St. Lucy'],
  '12-14': ['M', 'St. John of the Cross', 'St. John of the Cross'],
  '12-26': ['F', 'St. Stephen, the First Martyr', 'St. Stephen'],
  '12-27': ['F', 'St. John, Apostle & Evangelist', 'St. John'],
  '12-28': ['F', 'the Holy Innocents', 'Holy Innocents'],
};

/** Table of Liturgical Days, simplified: lower number wins. */
const PRECEDENCE: Record<Kind, number> = { S: 3, FL: 5, F: 7, M: 10, O: 12 };
const RANK: Record<Kind, LiturgicalRank> = { S: 'solemnity', FL: 'feast', F: 'feast', M: 'memorial', O: 'optional' };
const PREFIX: Record<Kind, string> = { S: 'Solemnity of', FL: 'Feast of', F: 'Feast of', M: 'Memorial of', O: 'Memorial of' };

interface Entry {
  precedence: number;
  celebration: string;
  shortName: string;
  rank: LiturgicalRank;
  season: LiturgicalSeason;
}

/** Gregorian Easter (Meeus/Jones/Butcher). */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

const sundayOnOrAfter = (d: Date) => addDays(d, (7 - d.getDay()) % 7);
const sundayOnOrBefore = (d: Date) => addDays(d, -d.getDay());

interface YearFrame {
  epiphany: Date;
  baptism: Date;
  ashWednesday: Date;
  easter: Date;
  pentecost: Date;
  christTheKing: Date;
  advent1: Date;
  christmas: Date;
}

function frame(year: number): YearFrame {
  const easter = easterSunday(year);
  // US: Epiphany on the Sunday between 2 and 8 January.
  const epiphany = sundayOnOrAfter(new Date(year, 0, 2));
  // Baptism of the Lord is the following Sunday, or the Monday when Epiphany falls on the 7th or 8th.
  const baptism = epiphany.getDate() >= 7 ? addDays(epiphany, 1) : addDays(epiphany, 7);
  const advent1 = sundayOnOrAfter(new Date(year, 10, 27));
  return {
    epiphany,
    baptism,
    ashWednesday: addDays(easter, -46),
    easter,
    pentecost: addDays(easter, 49),
    christTheKing: addDays(advent1, -7),
    advent1,
    christmas: new Date(year, 11, 25),
  };
}

function seasonOf(d: Date, f: YearFrame): LiturgicalSeason {
  if (d < f.baptism || d.getTime() === f.baptism.getTime()) return 'Christmas';
  if (d < f.ashWednesday) return 'Ordinary Time';
  const holyThursday = addDays(f.easter, -3);
  if (d < holyThursday) return 'Lent';
  if (d < f.easter) return 'Triduum';
  if (d <= f.pentecost) return 'Easter';
  if (d < f.advent1) return 'Ordinary Time';
  if (d < f.christmas) return 'Advent';
  return 'Christmas';
}

function ordinaryWeek(d: Date, f: YearFrame): number {
  const sunday = sundayOnOrBefore(d);
  if (d < f.ashWednesday) {
    // Week 1 is the week of the Baptism of the Lord.
    const firstSunday = sundayOnOrBefore(f.baptism);
    return Math.floor(daysBetween(firstSunday, sunday) / 7) + 1;
  }
  // After Pentecost, count back from Christ the King (34th Sunday).
  return 34 - Math.floor(daysBetween(sunday, f.christTheKing) / 7);
}

/** The season's own Sunday or weekday, before any saint is considered. */
function temporal(d: Date, f: YearFrame): Entry {
  const season = seasonOf(d, f);
  const dow = d.getDay();
  const weekday = WEEKDAYS[dow] ?? '';
  const sunday = sundayOnOrBefore(d);
  const isSunday = dow === 0;
  const make = (precedence: number, celebration: string, shortName: string, rank: LiturgicalRank): Entry => ({
    precedence, celebration, shortName, rank, season,
  });

  if (season === 'Ordinary Time') {
    const week = ordinaryWeek(d, f);
    return isSunday
      ? make(6, `${ordinalWords(week)} Sunday in Ordinary Time`, `${ordinalSuffix(week)} Sunday in Ordinary Time`, 'sunday')
      : make(13, `${weekday} of the ${ordinalWords(week)} Week in Ordinary Time`, `Ordinary Time · Week ${week}`, 'weekday');
  }

  if (season === 'Advent') {
    const week = Math.floor(daysBetween(f.advent1, sunday) / 7) + 1;
    if (isSunday) return make(2, `${ordinalWords(week)} Sunday of Advent`, `${ordinalSuffix(week)} Sunday of Advent`, 'sunday');
    const late = d.getMonth() === 11 && d.getDate() >= 17;
    return make(late ? 9 : 13, `${weekday} of the ${ordinalWords(week)} Week of Advent`, `Advent · Week ${week}`, 'weekday');
  }

  if (season === 'Lent') {
    const sinceAsh = daysBetween(f.ashWednesday, d);
    if (sinceAsh < 4) return make(9, `${weekday} after Ash Wednesday`, 'After Ash Wednesday', 'weekday');
    const week = Math.floor(daysBetween(addDays(f.ashWednesday, 4), sunday) / 7) + 1;
    if (week === 6) return make(2, `${weekday} of Holy Week`, 'Holy Week', 'weekday');
    if (isSunday) return make(2, `${ordinalWords(week)} Sunday of Lent`, `${ordinalSuffix(week)} Sunday of Lent`, 'sunday');
    return make(9, `${weekday} of the ${ordinalWords(week)} Week of Lent`, `Lent · Week ${week}`, 'weekday');
  }

  if (season === 'Easter') {
    const week = Math.floor(daysBetween(f.easter, sunday) / 7) + 1;
    if (daysBetween(f.easter, d) < 7) return make(2, `${weekday} within the Octave of Easter`, 'Octave of Easter', 'weekday');
    if (isSunday) return make(2, `${ordinalWords(week)} Sunday of Easter`, `${ordinalSuffix(week)} Sunday of Easter`, 'sunday');
    return make(13, `${weekday} of the ${ordinalWords(week)} Week of Easter`, `Easter · Week ${week}`, 'weekday');
  }

  // Christmas season (Triduum days are always covered by a movable entry).
  if (isSunday) return make(6, 'Second Sunday after the Nativity', 'Christmas Season', 'sunday');
  const inOctave = d.getMonth() === 11;
  return make(inOctave ? 9 : 13, inOctave ? `${weekday} within the Octave of Christmas` : `${weekday} of the Christmas Season`, inOctave ? 'Octave of Christmas' : 'Christmas Season', 'weekday');
}

function movable(year: number, f: YearFrame): Map<ISODate, Entry> {
  const out = new Map<ISODate, Entry>();
  const put = (d: Date, precedence: number, celebration: string, shortName: string, rank: LiturgicalRank) =>
    out.set(toISODate(d), { precedence, celebration, shortName, rank, season: seasonOf(d, f) });

  put(f.epiphany, 2, 'Solemnity of the Epiphany of the Lord', 'The Epiphany', 'solemnity');
  put(f.baptism, 5, 'Feast of the Baptism of the Lord', 'Baptism of the Lord', 'feast');
  put(f.ashWednesday, 2, 'Ash Wednesday', 'Ash Wednesday', 'weekday');
  put(addDays(f.easter, -7), 2, 'Palm Sunday of the Passion of the Lord', 'Palm Sunday', 'sunday');
  put(addDays(f.easter, -3), 1, 'Holy Thursday', 'Holy Thursday', 'solemnity');
  put(addDays(f.easter, -2), 1, 'Friday of the Passion of the Lord', 'Good Friday', 'solemnity');
  put(addDays(f.easter, -1), 1, 'Holy Saturday', 'Holy Saturday', 'solemnity');
  put(f.easter, 1, 'Easter Sunday of the Resurrection of the Lord', 'Easter Sunday', 'solemnity');
  put(addDays(f.easter, 7), 2, 'Second Sunday of Easter, of Divine Mercy', 'Divine Mercy Sunday', 'sunday');
  put(addDays(f.easter, 39), 2, 'Solemnity of the Ascension of the Lord', 'The Ascension', 'solemnity');
  put(f.pentecost, 2, 'Pentecost Sunday', 'Pentecost', 'solemnity');
  put(addDays(f.pentecost, 1), 10, 'Memorial of the Blessed Virgin Mary, Mother of the Church', 'Mary, Mother of the Church', 'memorial');
  put(addDays(f.pentecost, 7), 3, 'Solemnity of the Most Holy Trinity', 'Trinity Sunday', 'solemnity');
  put(addDays(f.pentecost, 14), 3, 'Solemnity of the Most Holy Body and Blood of Christ', 'Corpus Christi', 'solemnity');
  put(addDays(f.pentecost, 19), 3, 'Solemnity of the Most Sacred Heart of Jesus', 'Sacred Heart', 'solemnity');
  put(addDays(f.pentecost, 20), 10, 'Memorial of the Immaculate Heart of Mary', 'Immaculate Heart of Mary', 'memorial');
  put(f.christTheKing, 3, 'Solemnity of Our Lord Jesus Christ, King of the Universe', 'Christ the King', 'solemnity');
  put(f.christmas, 2, 'Solemnity of the Nativity of the Lord', 'Christmas', 'solemnity');

  // Holy Family: Sunday within the Octave of Christmas, or 30 December when there is none.
  const octaveSunday = sundayOnOrAfter(new Date(year, 11, 26));
  const holyFamily = octaveSunday.getMonth() === 11 && octaveSunday.getDate() <= 31 ? octaveSunday : new Date(year, 11, 30);
  put(holyFamily, 5, 'Feast of the Holy Family of Jesus, Mary & Joseph', 'The Holy Family', 'feast');
  return out;
}

const cache = new Map<number, Map<ISODate, LiturgicalDay>>();

function buildYear(year: number): Map<ISODate, LiturgicalDay> {
  const f = frame(year);
  const moving = movable(year, f);
  const days = new Map<ISODate, Entry>();

  for (let d = new Date(year, 0, 1); d.getFullYear() === year; d = addDays(d, 1)) {
    const iso = toISODate(d);
    const base = temporal(d, f);
    const mov = moving.get(iso);
    days.set(iso, mov && mov.precedence <= base.precedence ? mov : base);
  }

  for (const [key, [kind, name, shortName]] of Object.entries(FIXED)) {
    const [m = 1, day = 1] = key.split('-').map(Number);
    let date = new Date(year, m - 1, day);
    const entry: Omit<Entry, 'season'> = {
      precedence: PRECEDENCE[kind],
      celebration: key === '11-02' ? 'Commemoration of All the Faithful Departed' : `${PREFIX[kind]} ${name}`,
      shortName,
      rank: RANK[kind],
    };
    let current = days.get(toISODate(date));
    if (kind === 'S') {
      // An impeded solemnity moves to the next free day.
      while (current && current.precedence <= 3 && date.getFullYear() === year) {
        date = addDays(date, 1);
        current = days.get(toISODate(date));
      }
    }
    if (!current || date.getFullYear() !== year) continue;
    if (entry.precedence < current.precedence) {
      days.set(toISODate(date), { ...entry, season: current.season });
    }
  }

  const out = new Map<ISODate, LiturgicalDay>();
  for (const [date, e] of days) {
    out.set(date, { date, celebration: e.celebration, shortName: e.shortName, rank: e.rank, season: e.season });
  }
  return out;
}

export function getLiturgicalYear(year: number): Map<ISODate, LiturgicalDay> {
  let built = cache.get(year);
  if (!built) {
    built = buildYear(year);
    cache.set(year, built);
  }
  return built;
}

export function getLiturgicalDay(date: Date | ISODate): LiturgicalDay {
  const iso = typeof date === 'string' ? date : toISODate(date);
  const year = Number(iso.slice(0, 4));
  const day = getLiturgicalYear(year).get(iso);
  if (day) return day;
  return { date: iso, celebration: 'Weekday', shortName: 'Weekday', rank: 'weekday', season: 'Ordinary Time' };
}

/** Days the calendar sets in crimson: solemnities and feasts. */
export function isFeastDay(day: LiturgicalDay): boolean {
  return day.rank === 'solemnity' || day.rank === 'feast';
}

/** A saint or mystery is being kept (anything beyond the season's own day). */
export function hasCelebration(day: LiturgicalDay): boolean {
  return day.rank !== 'weekday' && day.rank !== 'sunday';
}
