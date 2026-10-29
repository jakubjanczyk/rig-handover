---
name: preview-upload
description: Publish a rig page as a public preview on GitHub Pages, and later re-upload it without the lane marker (ADR 0003). Use for a plan's "Preview for review" and "Clean up" issues.
---

# preview-upload

The preview is built in CI and deployed as a Pages artifact by `.github/workflows/preview.yml`
(manual run only), so the HTML is never committed. Link: `https://<owner>.github.io/<repo>/`.
Needs `gh`, signed in. Every step below is public: ask the human first, each time.

## Publish (with marker)

1. Once per repo: `gh api -X POST repos/<owner>/<repo>/pages -f build_type=workflow`
2. Set the marker from `.env` without printing it:
   `grep '^LANE_MARKER=' .env | cut -d= -f2- | tr -d '\n' | gh secret set LANE_MARKER`
3. `gh workflow run preview.yml --ref main`, then `gh run watch <id> --exit-status`.
4. Check the link the way the reviewer opens it (no sign-in): `curl -fsS <link>` → 200, the
   banner shows the marker, the rows are there. Compare with `pnpm preview:save` locally.

Local copy only: `pnpm preview:save [path] [out]` writes `var/preview/index.html` (git-ignored).

## Clean up (without marker)

Only after the reviewer has looked.

1. `gh secret delete LANE_MARKER`
2. Run the workflow again (step 3 above).
3. Fetch the link until the banner reads `no marker set` (Pages may serve the old copy for ~1 min),
   and `grep -c <marker>` on it is 0.

## Notes

- Auto mode in Claude Code blocks Pages and secret changes even after a yes in chat; ask the
  human to leave auto mode for these steps.
- To take the preview down: Settings → Pages → Unpublish.
