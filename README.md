# Urban Furniture Accounting System

Full-stack accounting workflow for the Urban Furniture hackathon problem: master data, role-based access, purchase and sales transactions, double-entry posting, payments, stock, budgets, and reports.

## Setup

Create `backend/.env` with the MySQL connection and JWT settings required by your environment. The frontend uses:

```env
VITE_API_URL=http://localhost:5000/api
```

Initialize a fresh database and seed the default accounts, journals, and Administrator:

```bash
mysql -u root -p < backend/db/schema.sql
cd backend
npm install
npm run seed
npm start
```

For an existing database, select the actual database configured in `backend/.env` before running the migration:

```bash
mysql -u root -p urban_furniture_test < backend/db/migrate.sql
```

Run the frontend in another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The API runs at `http://localhost:5000`.

The seed Administrator is `admin01` / `Admin@12345`; change it for any shared or deployed environment.

## Roles

- **Administrator**: manages users and all master-data lifecycle operations, records transactions, and views reports.
- **Accountant**: creates master data, records transactions, and views reports.
- **User**: linked to one Customer or Vendor contact; views only that contact's portal documents and records payments for them.

## Workflow

1. Create Contacts, Products, Accounts, Journals, Analytic Accounts, and Budgets.
2. Record `Purchase Order -> Vendor Bill -> Payment`.
3. Record `Sales Order -> Customer Invoice -> Payment`.
4. Review Journal Entries, Balance Sheet, Profit & Loss, Budget, Stock, and Trial Balance reports.

Vendor Bills, Customer Invoices, Payments, and Manual Journal Entries use `utils/ledger.js`, which rejects unbalanced postings. Goods purchases update Inventory and Goods invoices post Cost of Goods Sold plus the stock reduction.

## Tests

Start the backend and database first, then run:

```bash
cd backend
npm test
```
