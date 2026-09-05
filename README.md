# Urban Furniture — Accounting System

Built for the Odoo Hackathon 2026 finale, 24-hour round.

## What's in this drop (Part 1: Auth + Ledger foundation)

- Full database schema: Contacts, Users/Auth, Products, Chart of Accounts, Journals, Journal Entries (double-entry ledger), Purchase flow, Sales flow, Payments, Analytic Accounts, Budgets.
- **Auth, matching the mockup exactly**:
  - `POST /api/auth/signup` — public self-signup, always creates an **Accountant** account. Validates Login Id (unique, 6–12 chars), Email (no duplicates), Password (lowercase + uppercase + special char, >8 chars, not already used by any other account).
  - `POST /api/auth/create-user` — Administrator-only, creates a **User** (must link to a Contact) or another **Administrator**. Same validation rules.
  - `POST /api/auth/login` — generic `"Invalid Login Id or Password"` on any mismatch (never reveals which field was wrong).
- **`utils/ledger.js`** — the core `postJournalEntry()` function. Every transaction (Vendor Bill, Customer Invoice, Payment) must route through this. It rejects any entry where total debits ≠ total credits before it ever reaches the database — this is what keeps every report trustworthy.

## Setup

```bash
mysql -u root -p < backend/db/schema.sql
cd backend
cp .env.example .env      # set your MySQL password + a JWT secret
npm install
npm run seed               # seeds Chart of Accounts, Journals, one Administrator login
npm run dev                 # http://localhost:5000
```
Administrator login: `admin01` / `Admin@12345`

## Coming next (in order)

1. Master data CRUD — Contacts, Products, Chart of Accounts, Journals
2. Purchase flow — PO → Vendor Bill (posts to ledger) → Payment
3. Sales flow — SO → Customer Invoice (posts to ledger, multi-line with tax) → Payment
4. Reports — Balance Sheet, P&L, Budget Report (all pure aggregation off `journal_entry_lines`)
5. Frontend — role-aware nav (Administrator / Accountant / User-portal), matching your mockups
6. Contact portal — restricted view/pay-own-dues only

## Design decisions worth knowing for reviewer questions

- **"Password must be unique"** is implemented as: no two users may share the same plaintext password, checked via `bcrypt.compare` against every existing hash before creating an account. This is O(n) in user count — fine at hackathon scale, would need a different mechanism at real scale, but faithfully implements the literal requirement.
- **Journal entries support N lines**, not a rigid single debit/credit pair — needed for tax lines on invoices (Debtors / Sales Income / Tax Payable is a 3-line entry).
- **Bank/Cash journals** store one fixed `cash_or_bank_account_id` rather than a debit/credit pair, since the other leg of a payment (Debtors or Creditors) depends on the contact and direction (Receive vs Pay) — not something a journal can hardcode.
