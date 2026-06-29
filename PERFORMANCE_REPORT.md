# Performance Report

## Scope

This pass measured smoke-load timing from a local file URL with mocked API responses. It is intended as regression signal, not production Core Web Vitals.

## Results

- 26 page/viewport checks completed successfully.
- Typical mocked page render duration was below 1 second in the smoke report.
- No render-blocking production network calls were made during the test because the API was mocked.

## Recommendations

- Keep page data scoped via `getPageData(scopes)` to avoid loading every module on every page.
- Continue using popup/on-demand flows for dense actions such as product picking, accounting exports, and receipt settings.
- For production performance, run a real Lighthouse/Web Vitals audit against the hosted site and live Worker.
