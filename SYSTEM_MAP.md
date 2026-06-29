# ArtFlow POS System Map

## Architecture

- Static frontend: `index.html`, `pages/*.html`, `assets/css/*.css`, `assets/js/*.js`.
- API proxy: `cloudflare-worker/src/index.js`, receives JSON actions and forwards to Google Apps Script.
- Data backend: `apps-script/Code.gs` uses Google Sheets for records and Google Drive/Docs for product/content/order receipt assets.
- Local test harness: `tests/smoke-artflow.mjs` mocks the Worker/App Script API and runs browser checks with linked fake data.

## Main Modules

- Auth/RBAC: login, session token, role-based page/action access.
- Dashboard: KPI, net revenue chart, low stock alerts, recent orders.
- Products: catalog, pricing/margin, stock thresholds, managed product options, product content assets.
- Orders/Create Order: offline-first POS order creation, product picker, customer selection, payment/receipt PDF flows.
- Inventory: stock summary, receive/adjust stock, movement history.
- Accounting: receivables, ledger, profit/loss, payroll expense, reconciliation, export.
- Purchasing: suppliers, purchase orders, receive/pay/return/apply credit.
- Content: topic/content task management and Drive/Docs provisioning.
- Team Hub: meeting notes, business plans, pricing models, decisions.
- Users/Activity: staff management and audit log review.

## Critical Data Flows

1. Frontend page loads token from `localStorage`.
2. Frontend calls Worker with an `action` mapped in `assets/js/app.js`.
3. Worker validates CORS/body/action, forwards to Apps Script.
4. Apps Script reads/writes Google Sheets, optionally creates Drive/Docs/PDF assets.
5. Frontend normalizes returned data and re-renders page state.

## Deployment Notes

- `apps-script/` is ignored by Git in this repo. Local backend changes must be copied/deployed in Apps Script manually unless the ignore policy is changed.
- Worker needs `APPS_SCRIPT_URL` secret and optional `ALLOWED_ORIGINS`.
- Frontend static files can be served from GitHub Pages or a local static server.
