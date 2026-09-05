# Urban Furniture Accounting Frontend

React frontend for the Urban Furniture accounting API. It uses JWT authentication, role-aware navigation, backend master data, purchase and sales workflows, payments, journal entries, stock, and financial reports.

## Run

Set the API URL in `.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the backend and database first, then run:

```bash
npm install
npm run dev
```

Public registration creates an Accountant. Administrators create additional Administrator, Accountant, and contact-linked User accounts from the Users screen.

## Roles

- **Administrator**: full access to user management, master-data lifecycle, transactions, and reports.
- **Accountant**: creates master data, records transactions, and views reports.
- **User**: sees only the linked contact portal and can pay that contact's documents.

## Integration

`src/context/DataContext.jsx` owns authenticated API loading and writes. `src/context/AuthContext.jsx` handles login, registration, JWT session validation, and Administrator user management. Reports read the backend report endpoints rather than reconstructing accounting data in the browser.

Available reports are Balance Sheet, Profit & Loss, Budget, Stock, and Trial Balance.
