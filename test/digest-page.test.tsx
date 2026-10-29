import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

describe('digest page (smoke)', () => {
  it('renders a night and 404s a missing one', async () => {
    const app = createApp(config);
    const ok = await app.request('/digest/2026-10-28');
    expect(ok.status).toBe(200);
    expect(await ok.text()).toContain('fixtures/refresh');
    expect((await app.request('/digest/2026-01-01')).status).toBe(404);
  });
});
