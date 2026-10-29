import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, Night, ReadNight, RunLine, RunStatus } from './types.js';

const NIGHT = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES: readonly RunStatus[] = ['ok', 'retry', 'fail'];

// Parse at the edge: anything that isn't a well-formed run line is null.
export function parseLine(text: string): RunLine | null {
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.at !== 'string' || Number.isNaN(Date.parse(o.at))) return null;
  if (typeof o.job !== 'string' || o.job === '') return null;
  if (!STATUSES.includes(o.status as RunStatus)) return null;
  if (o.owner !== null && typeof o.owner !== 'string') return null;
  if (o.error !== undefined && typeof o.error !== 'string') return null;
  const line: RunLine = { at: o.at, job: o.job, status: o.status as RunStatus, owner: o.owner };
  if (typeof o.error === 'string') line.error = o.error;
  return line;
}

export function digest(lines: RunLine[]): DigestRow[] {
  const byJob = new Map<string, RunLine[]>();
  for (const l of lines) byJob.set(l.job, [...(byJob.get(l.job) ?? []), l]);
  return [...byJob.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([job, ls]) => {
      const sorted = [...ls].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
      const first = sorted[0]!;
      const last = sorted[sorted.length - 1]!;
      const withError = sorted.filter((l) => l.error !== undefined);
      return {
        job,
        owner: last.owner,
        runs: sorted.length,
        retries: sorted.filter((l) => l.status === 'retry').length,
        lastStatus: last.status,
        lastError: withError.length ? withError[withError.length - 1]!.error! : null,
        firstAt: first.at,
        lastAt: last.at,
      };
    });
}

export const readNight: ReadNight = (runsDir, night) => {
  if (!NIGHT.test(night)) return null;
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch {
    return null;
  }
  const lines: RunLine[] = [];
  let badLines = 0;
  for (const raw of text.split('\n')) {
    if (raw.trim() === '') continue;
    const l = parseLine(raw);
    if (l) lines.push(l);
    else badLines++;
  }
  return { night, rows: digest(lines), badLines } satisfies Night;
};
