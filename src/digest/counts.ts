import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLine } from './read.js';

export type StatusCounts = { ok: number; retry: number; fail: number; bad: number };

const NIGHT = /^\d{4}-\d{2}-\d{2}$/;

// Per run line, by status. Lines that don't parse count only in `bad`.
// null when the night has no readable file.
export function countStatuses(runsDir: string, night: string): StatusCounts | null {
  if (!NIGHT.test(night)) return null;
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch {
    return null;
  }
  const counts: StatusCounts = { ok: 0, retry: 0, fail: 0, bad: 0 };
  for (const raw of text.split('\n')) {
    if (raw.trim() === '') continue;
    const l = parseLine(raw);
    if (l) counts[l.status]++;
    else counts.bad++;
  }
  return counts;
}
