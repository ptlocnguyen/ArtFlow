# ArtFlow POS QA Report

## Run Summary

- Date: 2026-06-29
- Commands run:
  - `node --check assets/js/app.js`
  - `node --check cloudflare-worker/src/index.js`
  - `npm run qa:seed`
  - `npm run qa:smoke`
- Result: pass
- Coverage: 26 page/viewport render checks, 13 pages across desktop and mobile.

## What Changed

- Added reusable Playwright smoke QA harness.
- Added linked fake data fixture for end-to-end UI checks without touching production Sheets/Drive.
- Added screenshot/report artifacts under `test-artifacts/`.
- Adjusted Team Hub layout so the main panel no longer stretches into a large empty block when data is sparse.

## Evidence

- JSON report: `test-artifacts/reports/smoke-report.json`
- Screenshots:
  - `test-artifacts/screenshots/desktop/*.png`
  - `test-artifacts/screenshots/mobile/*.png`

## Findings

- No JavaScript syntax errors found in frontend or Worker.
- No console/page errors in smoke-tested pages.
- No document-level horizontal overflow at tested desktop/mobile widths.
- Team Hub had excessive blank panel height with sparse data; fixed.

## Remaining Risks

- Apps Script code is currently ignored by Git. Backend changes must be deployed manually or the repo policy should be changed.
- Smoke tests use mocked API responses, so they verify frontend integration contracts but not live Google Sheets/Drive permissions.
- Receipt PDF visual quality should still be checked against a real thermal printer profile after Apps Script deployment.
