CREATE DATABASE IF NOT EXISTS ufa;
USE ufa;

-- ─── Contacts (created first — users of type 'User' link here) ────
CREATE TABLE IF NOT EXISTS contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  type ENUM('Customer','Vendor','Both') NOT NULL,
  email VARCHAR(150),
  mobile VARCHAR(20),
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(12),
  profile_image VARCHAR(255),
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── Users & Auth ───────────────────────────────────────────────
-- role: Administrator (full access), Accountant (invoicing user, self-signup),
-- User (portal login, created by Admin, tied to exactly one Contact).
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120),
  login_id VARCHAR(12) NOT NULL UNIQUE,   -- 6-12 chars, enforced in app layer
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('Administrator','Accountant','User') NOT NULL,
  contact_id INT NULL,                    -- set only when role = 'User'
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contact_id) REFERENCES contacts(id)
);

-- ─── Products ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  type ENUM('Goods','Service','Combo') NOT NULL,
  sales_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  category VARCHAR(100),
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── Chart of Accounts ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  type ENUM('Asset','Liability','Income','Expense','Capital') NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE
);

-- ─── Journals ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS journals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type ENUM('Sales','Purchase','Bank','Cash') NOT NULL,
  default_debit_account_id INT,     -- used by Sales/Purchase journals
  default_credit_account_id INT,    -- used by Sales/Purchase journals
  cash_or_bank_account_id INT,      -- used by Bank/Cash journals (the one fixed leg; the other leg is Debtors/Creditors)
  FOREIGN KEY (default_debit_account_id) REFERENCES accounts(id),
  FOREIGN KEY (default_credit_account_id) REFERENCES accounts(id),
  FOREIGN KEY (cash_or_bank_account_id) REFERENCES accounts(id)
);

-- ─── Analytic Accounts & Budgets ────────────────────────────────
CREATE TABLE IF NOT EXISTS analytic_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type ENUM('Income','Expense') NOT NULL
);

CREATE TABLE IF NOT EXISTS budgets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  responsible_person VARCHAR(120),
  analytic_account_id INT NOT NULL,
  planned_amount DECIMAL(14,2) NOT NULL,
  FOREIGN KEY (analytic_account_id) REFERENCES analytic_accounts(id)
);

-- ─── Journal Entries (the ledger — every transaction posts here) ─
CREATE TABLE IF NOT EXISTS journal_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  journal_id INT NOT NULL,
  entry_date DATE NOT NULL,
  reference VARCHAR(150),
  source_type ENUM('VendorBill','CustomerInvoice','Payment','Manual') NOT NULL,
  source_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (journal_id) REFERENCES journals(id)
);

CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  journal_entry_id INT NOT NULL,
  account_id INT NOT NULL,
  debit DECIMAL(14,2) NOT NULL DEFAULT 0,
  credit DECIMAL(14,2) NOT NULL DEFAULT 0,
  analytic_account_id INT NULL,
  FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (analytic_account_id) REFERENCES analytic_accounts(id)
);

-- ─── Purchase flow ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT NOT NULL,
  order_date DATE NOT NULL,
  status ENUM('Draft','Confirmed') NOT NULL DEFAULT 'Draft',
  total DECIMAL(14,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (vendor_id) REFERENCES contacts(id)
);

CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  po_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS vendor_bills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  po_id INT,
  vendor_id INT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE,
  status ENUM('Draft','Posted','PartiallyPaid','Paid') NOT NULL DEFAULT 'Draft',
  total DECIMAL(14,2) NOT NULL,
  amount_paid DECIMAL(14,2) NOT NULL DEFAULT 0,
  journal_entry_id INT NULL,
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id),
  FOREIGN KEY (vendor_id) REFERENCES contacts(id),
  FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id)
);

-- ─── Sales flow ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  order_date DATE NOT NULL,
  status ENUM('Draft','Confirmed') NOT NULL DEFAULT 'Draft',
  total DECIMAL(14,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (customer_id) REFERENCES contacts(id)
);

CREATE TABLE IF NOT EXISTS sales_order_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  so_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  tax_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (so_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS customer_invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  so_id INT,
  customer_id INT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE,
  status ENUM('Draft','Posted','PartiallyPaid','Paid') NOT NULL DEFAULT 'Draft',
  total DECIMAL(14,2) NOT NULL,
  amount_paid DECIMAL(14,2) NOT NULL DEFAULT 0,
  journal_entry_id INT NULL,
  FOREIGN KEY (so_id) REFERENCES sales_orders(id),
  FOREIGN KEY (customer_id) REFERENCES contacts(id),
  FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id)
);

-- ─── Payments (against a bill OR an invoice, never both) ───────
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contact_id INT NOT NULL,
  payment_type ENUM('Receive','Pay') NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  payment_date DATE NOT NULL,
  method ENUM('Cash','Bank') NOT NULL,
  linked_bill_id INT NULL,
  linked_invoice_id INT NULL,
  journal_entry_id INT NULL,
  created_by INT,
  FOREIGN KEY (contact_id) REFERENCES contacts(id),
  FOREIGN KEY (linked_bill_id) REFERENCES vendor_bills(id),
  FOREIGN KEY (linked_invoice_id) REFERENCES customer_invoices(id),
  FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_jel_account ON journal_entry_lines(account_id);
CREATE INDEX idx_jel_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX idx_je_date ON journal_entries(entry_date);
CREATE INDEX idx_bills_vendor ON vendor_bills(vendor_id);
CREATE INDEX idx_invoices_customer ON customer_invoices(customer_id);
