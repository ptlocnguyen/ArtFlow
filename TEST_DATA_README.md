# Test Data README

## Files

- `tests/fixtures/artflow-test-state.mjs`: source fixture used by smoke tests.
- `test-artifacts/data/artflow-test-state.json`: generated JSON snapshot.

## Generate Data

```powershell
npm run qa:seed
```

## Reset Artifacts

```powershell
npm run qa:reset
```

## Fixture Contents

- Admin and staff users.
- Product catalog with images, brands, categories, low-stock thresholds, and margins.
- Customers with loyalty points.
- Paid and unpaid orders.
- Stock movements.
- Accounting accounts, categories, and transactions.
- Supplier and purchase order data.
- Content task and Team Hub records.

The fixture is intentionally small but linked enough to exercise cross-module UI and calculations.
