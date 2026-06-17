Test data for import workflow

Files:
- sample-import.csv — comma-separated values including several edge cases
- sample-import.xls — Excel-compatible HTML table (rename/open in Excel)
- sample-import.json — JSON array of objects with same fields

Columns provided:
- id, name, email, quantity, price, date_received, country, gtin

Row cases:
- Row 1 (id=1): valid row (Alpha Co)
- Row 2: invalid email format ("invalid-email")
- Row 3: missing email, zero quantity, future date (2026-01-01)
- Row 4: negative price (should trigger data-quality rule for invalid numeric)
- Row 5: valid row (Echo GmbH)
- Row 6: duplicate id and duplicate gtin (intentional duplicate)

Usage:
- Use the CSV or JSON files to test parsing and validation.
- The .xls file is an HTML table saved with .xls extension so Excel can open it directly.
- Expected: validation rules should flag rows 2,3,4,6 depending on configured rules (invalid email, missing required, negative values, duplicates, future dates).

If you want, I can also upload one of these files to the local import UI (`/home/imports`) to run an end-to-end test.
