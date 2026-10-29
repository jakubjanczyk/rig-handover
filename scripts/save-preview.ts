// Plan morning-digest § 3/§ 4. Saves one rig page as a single HTML file, the way the app serves it
// (ADR 0001: the page is self-contained). The banner shows LANE_MARKER from the environment,
// or "no marker set" when it is unset. Usage: pnpm preview:save [path] [out]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createApp } from '../src/app.js';

const [path = '/digest/2026-10-28', out = 'var/preview/index.html'] = process.argv.slice(2);
const res = await createApp().request(path);
if (res.status !== 200) {
  console.error(`${path} answered ${res.status}`);
  process.exit(1);
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, await res.text());
console.log(`saved ${path} → ${out}`);
