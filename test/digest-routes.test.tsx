import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Night } from '../src/digest/types.js';

const line = (at: string, job: string, status: string, owner: string | null, error?: string) =>
  JSON.stringify({ at, job, status, owner, ...(error ? { error } : {}) });

let app: ReturnType<typeof createApp>;

beforeAll(() => {
  const dir = mkdtempSync(join(tmpdir(), 'rig-routes-'));
  writeFileSync(
    join(dir, '2026-10-01.jsonl'),
    [
      line('2026-10-02T01:10:00+01:00', 'b/second', 'fail', null, 'quota exceeded'),
      line('2026-10-02T01:00:00+01:00', 'a/first', 'retry', 'rook', 'upstream 503'),
      line('2026-10-02T01:05:00+01:00', 'a/first', 'ok', 'rook'),
    ].join('\n') + '\n',
  );
  writeFileSync(join(dir, '2026-10-02.jsonl'), '');
  writeFileSync(
    join(dir, '2026-10-03.jsonl'),
    [
      line('2026-10-04T01:00:00+01:00', 'a/first', 'ok', 'rook'),
      'not json {',
      line('2026-10-04T02:00:00+01:00', 'c/third', 'ok', 'rook'),
    ].join('\n') + '\n',
  );
  app = createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: dir });
});

const json = async (night: string) => {
  const res = await app.request(`/api/digest/${night}`);
  return { res, body: (await res.json()) as Night };
};

describe('GET /digest/:night and /api/digest/:night', () => {
  it('200 for a normal night; page and JSON list the same jobs in order', async () => {
    const { res, body } = await json('2026-10-01');
    expect(res.status).toBe(200);
    expect(body.badLines).toBe(0);
    expect(body.rows.map((r) => r.job)).toEqual(['a/first', 'b/second']);
    expect(body.rows[0]).toMatchObject({ owner: 'rook', runs: 2, retries: 1, lastStatus: 'ok', lastError: 'upstream 503' });
    expect(body.rows[1]).toMatchObject({ owner: null, lastStatus: 'fail', lastError: 'quota exceeded' });

    const page = await app.request('/digest/2026-10-01');
    expect(page.status).toBe(200);
    const html = await page.text();
    const positions = body.rows.map((r) => html.indexOf(r.job));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(html).toContain('quota exceeded');
    expect(html).toContain('2026-10-02T01:10:00+01:00');
    expect(html).not.toContain('nothing ran');
    expect(html).not.toContain('parse');
  });

  it('404 for a night with no file', async () => {
    const { res, body } = await json('2026-01-01');
    expect(res.status).toBe(404);
    expect(body).toMatchObject({ error: 'no such night', night: '2026-01-01' });
    const page = await app.request('/digest/2026-01-01');
    expect(page.status).toBe(404);
    expect(await page.text()).toContain('no run log for this night');
  });

  it('empty night: "nothing ran" and no rows', async () => {
    const { res, body } = await json('2026-10-02');
    expect(res.status).toBe(200);
    expect(body).toEqual({ night: '2026-10-02', rows: [], badLines: 0 });
    const page = await app.request('/digest/2026-10-02');
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('nothing ran');
  });

  it('bad line: still 200, counted, good lines rendered', async () => {
    const { res, body } = await json('2026-10-03');
    expect(res.status).toBe(200);
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r) => r.job)).toEqual(['a/first', 'c/third']);
    const page = await app.request('/digest/2026-10-03');
    expect(page.status).toBe(200);
    const html = await page.text();
    expect(html).toContain('1 line didn&#39;t parse');
    expect(html).toContain('a/first');
    expect(html).toContain('c/third');
  });
});
