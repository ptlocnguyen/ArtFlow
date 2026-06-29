# UI/UX Review

## Reviewed Screens

- Dashboard
- Orders and Create Order
- Products
- Content
- Team Hub
- Customers
- Inventory
- Accounting
- Purchasing
- Reports
- Users
- Activity

## Automated Checks

- Desktop viewport: `1440x900`
- Mobile viewport: `390x844`
- App shell rendering
- Console/page errors
- Document-level horizontal overflow
- Screenshot capture

## Improvements Made

- Team Hub list panel now sizes to content instead of creating a large empty area on desktop.
- Smoke screenshots are now generated for every page so future UI regressions are easier to catch.

## Design Notes

- The current UI benefits from internal scrolling in dense operational pages, but sparse pages should prefer content-height panels.
- Button icon usage is mostly consistent and improves scan speed.
- Mobile layouts now pass overflow checks, but final visual QA should still inspect long Vietnamese text and real product images.
