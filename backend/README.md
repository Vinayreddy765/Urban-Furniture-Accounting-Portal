# Urban Furniture - Accounting System Backend

Backend for the Urban Furniture accounting workflow: master data -> purchase/sales -> bill/invoice -> payment -> double-entry ledger -> reports.

## Roles and authentication

There are exactly three application roles:

- **Administrator** — the business owner. The first Administrator is created by the seed script. Administrators can manage master data, users, transactions and reports.
- **Accountant** — the internal invoicing/accounting user. `/api/auth/signup` creates an Accountant only; an Administrator can also create one through `/api/auth/create-user`.
- **User** — the external Contact portal account. It is always linked to one Contact (Customer or Vendor). It can only access its own invoices/bills and payment functionality.

A public signup can **never** create an Administrator or Contact portal User.

### Authentication flow

```text
Seeded Administrator
        |
        +--> creates Accountant or portal User
        |
        +--> manages accounting data

Accountant
        |
        +--> creates Contacts, Products, Accounts, etc.
        +--> records purchases, sales and payments
        +--> views reports

Contact Master
        |
        +--> optional portal account (role=User)
                 |
                 +--> own invoices/bills
                 +--> payments
```

## Main API groups

- `/api/auth` — signup, login, current user, Administrator user management
- `/api/contacts` — Contact Master; `/mine` for the portal user
- `/api/products` — Product Master and categories
- `/api/accounts` — Chart of Accounts
- `/api/journals` — Journals
- `/api/journal-entries` — posted ledger entries
- `/api/analytic-accounts` — analytic accounts
- `/api/budgets` — budgets
- `/api/purchase-orders` — Purchase Order flow
- `/api/vendor-bills` — PO -> Vendor Bill; posts ledger entry
- `/api/sales-orders` — Sales Order flow
- `/api/customer-invoices` — SO -> Customer Invoice; posts ledger entry
- `/api/payments` — internal payment registration and portal payment
- `/api/portal` — restricted Contact portal dashboard/invoices/bills
- `/api/reports` — Balance Sheet, Profit & Loss, Budget Report, Trial Balance

Protected APIs require `Authorization: Bearer <JWT>`.

## Accounting rules

- Purchase Order is operational only; converting a **Confirmed PO** to a Vendor Bill posts:
  - Debit Purchase Expense
  - Credit Creditors
- Confirmed Sales Order converts to a Customer Invoice and posts:
  - Debit Debtors for the invoice total
  - Credit Sales Income for the taxable/subtotal amount
  - Credit Tax Payable for tax
- Vendor payment posts:
  - Debit Creditors
  - Credit Cash/Bank
- Customer receipt posts:
  - Debit Cash/Bank
  - Credit Debtors
- Every posted transaction uses `utils/ledger.js`, which rejects unbalanced journal entries.

The business specification defines the same end-to-end flow and the required Balance Sheet, P&L and Budget reports.

## Setup - fresh database

```bash
mysql -u root -p < backend/db/schema.sql
cd backend
npm install
# Set DB credentials and a long random JWT_SECRET in .env
npm run seed
npm run dev
```

Seeded Administrator:

```text
loginId: admin01
password: Admin@12345
```

Change the seeded password before production use.

## Upgrade an existing database

If you already created the old database/schema, run:

```bash
mysql -u root -p < backend/db/migrate.sql
```

Do not run `schema.sql` over a database you need to preserve; use the migration for the incremental schema changes.

## Important

The UI mockups are treated as **visual reference only**. They do not define permissions or accounting behavior. The backend follows the Urban Furniture functional specification first; the frontend will consume these APIs after backend verification.
