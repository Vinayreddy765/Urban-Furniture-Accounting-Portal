# Urban Furniture — Accounting Frontend

Complete frontend for the accounting system: master data, purchase and sales
flows, payments, and financial reports — built with React, React Router, and
Tailwind CSS. It runs fully standalone right now (state persisted to
`localStorage`), so it's usable before the backend is ready. There's no
seeded data — it starts with a blank chart of accounts' worth of structure
and nothing else; every contact, product, order, and user is created through
the UI.

## Run it

```bash
npm install
npm run dev
```

Open the printed local URL. You'll land on a **Sign in** screen. Since there
are no accounts yet, use **Register** to create the first one — pick Admin
if you're setting up the books, or Invoicing User for day-to-day entry.
Contact accounts (for a vendor or customer to view their own invoices/bills)
must be linked to an existing contact record, so create the contact first
from an Admin or Invoicing User account, then register the Contact login
against it.

## Project structure

```
src/
  context/
    AuthContext.jsx     — current user + role-based permission checks
    DataContext.jsx      *** the seam with your backend, read this first ***
  components/            reusable UI: Layout, Modal, form fields, tables
  pages/                 one file per screen (Contacts, Products, Purchase
                          Orders, Vendor Bills, Sales Orders, Customer
                          Invoices, Payments, Reports/*)
  utils/format.js         currency & date formatting
```

## Where your backend plugs in

Everything the UI reads or writes goes through **`src/context/DataContext.jsx`**.
Pages never touch `localStorage` or mock arrays directly — they call functions
like `addContact()`, `createPurchaseOrder()`, `convertPOToBill()`,
`recordPayment()`, `accountBalance()`. That means:

1. Replace the body of each function in `DataContext.jsx` with a `fetch()` call
   to your API (e.g. `addContact` → `POST /api/contacts`), keeping the same
   argument and return shape.
2. Swap the `useState(loadInitial)` + local defaults for data fetched on mount
   (`useEffect` + `GET /api/...`), or migrate to React Query/SWR if you'd
   rather. The only non-empty defaults are the chart of accounts and journals
   (`a1`–`a7`, `j1`–`j4`) that the ledger engine posts against — treat those
   as the starting configuration for a new company, not sample data.
3. `AuthContext.jsx`'s `login()` and `register()` are stand-ins for real
   auth (passwords are just compared in plain text against `localStorage`
   right now — fine for a demo, never for production). Point them at
   `POST /api/auth/login` and `POST /api/auth/register` and keep returning
   `{ id, name, email, role, contactId }`. Swap the `localStorage` session
   for a real token (JWT in an `Authorization` header, or an httpOnly
   cookie) at the same time.

The double-entry bookkeeping (journal entries created when a bill/invoice is
generated or a payment is recorded, and `accountBalance()` which sums them
per account) is currently computed client-side as a realistic stand-in. Once
the backend owns the ledger, `accountBalance()` and the report pages
(`pages/reports/*`) should simply read the numbers your API returns instead
of computing them locally — the UI layer doesn't need to change.

## Roles

- **Admin** — full access: create/edit/archive all master data, record
  transactions, view reports.
- **Invoicing User** — create master data, record transactions, view
  reports (no archiving).
- **Contact** — signed-in vendor/customer; sees only their own invoices/bills
  under "My Invoices & Bills" and can pay them.

## Notes for the backend team

- Master data: Contacts, Products, Chart of Accounts, Journals, Analytic
  Accounts, Budgets.
- Transaction flow: Purchase Order → Vendor Bill → Payment, and
  Sales Order → Customer Invoice → Payment, matching the problem statement.
- Reports: Balance Sheet, Profit & Loss, Budget Report — all derived from
  journal entries in `DataContext.jsx`.
