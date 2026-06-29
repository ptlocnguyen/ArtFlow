# ArtFlow POS Test Plan

## Automated Smoke QA

Command:

```powershell
npm run qa:seed
npm run qa:smoke
```

The smoke test:

- Seeds linked fake data across products, customers, orders, stock, accounting, purchasing, content, and Team Hub.
- Opens 13 application pages on desktop `1440x900` and mobile `390x844`.
- Mocks Worker/App Script API calls.
- Verifies app shell render, console/page errors, and document-level horizontal overflow.
- Captures screenshots to `test-artifacts/screenshots/`.
- Writes JSON results to `test-artifacts/reports/smoke-report.json`.

## Manual Regression Checklist

- Login and session renewal.
- Create order with offline defaults, modified line price, discount percent, cash received, print/PDF.
- View order detail and reopen saved receipt PDF.
- Receive/adjust inventory and verify stock movements.
- Record receivable payment and check accounting ledger/profit report.
- Create content item and provision Drive/Docs assets.
- Create Team Hub meeting, plan, pricing model, and decision.
- Deploy Apps Script, run `setupDatabase`, then verify new sheets/headers.

## Test Data Rules

- Fake products include low-stock and healthy-stock cases.
- Fake orders include paid and unpaid examples.
- Fake accounting data includes income, purchase expense, and operating expense.
- Fake Team Hub data includes one item per work type.
