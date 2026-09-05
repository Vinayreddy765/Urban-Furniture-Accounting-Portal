-- Run this only when upgrading an existing Urban Furniture database created
-- by an earlier version of the backend. A fresh database should use schema.sql.
USE ufa;

ALTER TABLE journals ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE purchase_order_lines ADD COLUMN IF NOT EXISTS analytic_account_id INT NULL;
ALTER TABLE sales_order_lines ADD COLUMN IF NOT EXISTS analytic_account_id INT NULL;
ALTER TABLE customer_invoices ADD COLUMN IF NOT EXISTS subtotal DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE customer_invoices ADD COLUMN IF NOT EXISTS tax_total DECIMAL(14,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS customer_invoice_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  tax_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  line_subtotal DECIMAL(14,2) NOT NULL,
  tax_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  line_total DECIMAL(14,2) NOT NULL,
  analytic_account_id INT NULL,
  FOREIGN KEY (invoice_id) REFERENCES customer_invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (analytic_account_id) REFERENCES analytic_accounts(id)
);
