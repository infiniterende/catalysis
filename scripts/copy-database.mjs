/**
 * Copies every row from one Postgres database to another with the same schema:
 * used to move Catalysis from Supabase to Cloud SQL.
 *
 *   SOURCE_URL=postgres://… TARGET_URL=postgres://… node scripts/copy-database.mjs
 *
 * The target's tables must already exist (run `prisma migrate deploy` against it
 * first) and be empty; the script refuses to write into a table that has rows.
 * Tables are copied parents first, so foreign keys hold at every step, and the
 * row counts are compared at the end. Values are passed through as Postgres
 * text, so timestamps, JSON and bytes arrive exactly as they left.
 */
import pg from 'pg';

const { SOURCE_URL, TARGET_URL } = process.env;
if (!SOURCE_URL || !TARGET_URL) {
  console.error('Set SOURCE_URL and TARGET_URL.');
  process.exit(1);
}
if (SOURCE_URL === TARGET_URL) {
  console.error('SOURCE_URL and TARGET_URL are the same database.');
  process.exit(1);
}

// Read dates and times as the text Postgres sent, so nothing shifts by a time zone on the way.
for (const oid of [1082, 1083, 1114, 1184, 1266]) pg.types.setTypeParser(oid, (v) => v);

/** Keeps sslmode from the URL working the same way libpq does ("require" encrypts without checking the certificate). */
const clientFor = (url) => {
  const u = new URL(url);
  const mode = u.searchParams.get('sslmode');
  u.searchParams.delete('sslmode');
  u.searchParams.delete('pgbouncer');
  return new pg.Client({ connectionString: u.toString(), ssl: mode && mode !== 'disable' ? { rejectUnauthorized: false } : undefined });
};

const source = clientFor(SOURCE_URL);
const target = clientFor(TARGET_URL);
await source.connect();
await target.connect();

const SKIP = new Set(['_prisma_migrations']);
const quote = (name) => `"${name.replace(/"/g, '""')}"`;

try {
  const tables = (await source.query(`select tablename from pg_tables where schemaname = 'public' order by tablename`)).rows
    .map((r) => r.tablename)
    .filter((t) => !SKIP.has(t));

  // Which tables each table points at, to copy parents before children.
  const fks = (await source.query(`
    select c.conrelid::regclass::text as child, c.confrelid::regclass::text as parent
    from pg_constraint c join pg_namespace n on n.oid = c.connamespace
    where c.contype = 'f' and n.nspname = 'public'`)).rows;
  const strip = (name) => name.replace(/^public\./, '').replace(/^"|"$/g, '');
  const parents = new Map(tables.map((t) => [t, new Set()]));
  for (const { child, parent } of fks) if (strip(child) !== strip(parent)) parents.get(strip(child))?.add(strip(parent));
  const order = [];
  const seen = new Set();
  const visit = (t, path = new Set()) => {
    if (seen.has(t)) return;
    if (path.has(t)) throw new Error(`Foreign keys go round in a circle at ${t}.`);
    path.add(t);
    for (const p of parents.get(t) ?? []) visit(p, path);
    seen.add(t);
    order.push(t);
  };
  tables.forEach((t) => visit(t));

  const missing = [];
  for (const t of order) {
    const exists = await target.query(`select 1 from pg_tables where schemaname = 'public' and tablename = $1`, [t]);
    if (exists.rowCount === 0) missing.push(t);
    else if ((await target.query(`select count(*)::int as n from ${quote(t)}`)).rows[0].n > 0) {
      throw new Error(`${t} already has rows in the target. Nothing was copied.`);
    }
  }
  if (missing.length) throw new Error(`The target is missing tables: ${missing.join(', ')}. Run the migrations first.`);

  await target.query('begin');
  const counts = [];
  for (const t of order) {
    const columns = (await source.query(
      `select column_name from information_schema.columns where table_schema = 'public' and table_name = $1 order by ordinal_position`,
      [t],
    )).rows.map((r) => r.column_name);
    const list = columns.map(quote).join(', ');
    // Every value as text, cast back to the column's own type on the way in.
    const rows = (await source.query(`select ${columns.map((c) => `${quote(c)}::text`).join(', ')} from ${quote(t)}`, [])).rows;
    const types = (await target.query(
      `select a.attname as name, format_type(a.atttypid, a.atttypmod) as type
       from pg_attribute a where a.attrelid = $1::regclass and a.attnum > 0 and not a.attisdropped`,
      [quote(t)],
    )).rows;
    const typeOf = new Map(types.map((r) => [r.name, r.type]));
    const BATCH = 200;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const values = [];
      const tuples = batch.map((row, r) =>
        `(${columns.map((c, k) => {
          values.push(row[c]);
          return `$${r * columns.length + k + 1}::${typeOf.get(c) ?? 'text'}`;
        }).join(', ')})`,
      );
      await target.query(`insert into ${quote(t)} (${list}) values ${tuples.join(', ')}`, values);
    }
    counts.push([t, rows.length]);
  }

  // Check before committing: every table holds as many rows as its source.
  for (const [t, n] of counts) {
    const got = (await target.query(`select count(*)::int as n from ${quote(t)}`)).rows[0].n;
    if (got !== n) throw new Error(`${t}: copied ${got} of ${n} rows.`);
  }
  await target.query('commit');
  console.log(counts.filter(([, n]) => n > 0).map(([t, n]) => `${t} ${n}`).join(', '));
  console.log(`copied ${counts.reduce((a, [, n]) => a + n, 0)} rows across ${counts.length} tables`);
} catch (error) {
  await target.query('rollback').catch(() => undefined);
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await source.end();
  await target.end();
}
