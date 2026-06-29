# Business Logic Review

## Reviewed Areas

- Auth and RBAC gates for admin, sales, inventory, accounting, content, and purchasing actions.
- Order creation totals: line price, line discount, order discount, loyalty points, shipping fee, rounding, cash received/change.
- Inventory movements: initial stock, sale, manual receive/adjust, purchase receive/cancel/return.
- Accounting: receivables, cash transactions, profit/loss, payroll expense, reconciliation, exports.
- Purchasing: supplier debt, purchase payment, return credit, supplier credit application.
- Content and Team Hub: API-backed creation/update/archive with normalized item payloads.

## Positive Notes

- Most business writes are behind Apps Script locks.
- Stock-affecting flows create stock movement history.
- Receipts, content documents, and product media are designed to be generated into Drive.
- Frontend has role checks before opening sensitive actions.

## Watch Items

- Apps Script deployment must include the current `team_items` sheet and Team Hub actions.
- Audit logging for all newer actions should be kept aligned when adding backend actions.
- Accounting exports should be sampled against real Vietnamese date/time/currency formatting.
- Mock tests do not replace live concurrency checks against Google Sheets locks.
