// Plan morning-digest § 1. The shape every part of the digest builds against.

export type RunStatus = 'ok' | 'retry' | 'fail';

// One line of runs/<night>.jsonl, after parsing.
export type RunLine = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

// One row per job for the night. Times keep the offset from the log.
export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

export type Night = {
  night: string;
  rows: DigestRow[]; // sorted by job
  badLines: number; // lines that didn't parse; counted, never thrown
};

// null when the night has no file (or the name isn't a YYYY-MM-DD night).
export type ReadNight = (runsDir: string, night: string) => Night | null;
