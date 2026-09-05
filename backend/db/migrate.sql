-- Run this only when upgrading an existing Urban Furniture database created
-- by an earlier version of the backend. A fresh database should use schema.sql.
-- Run with the target database selected, for example:
-- mysql -u root -p urban_furniture_test < backend/db/migrate.sql

UPDATE contacts SET type = 'Customer' WHERE CAST(type AS CHAR) = 'Both';
ALTER TABLE contacts MODIFY COLUMN type ENUM('Customer','Vendor') NOT NULL;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'journals' AND column_name = 'is_archived') = 0, 'ALTER TABLE journals ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT FALSE', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'stock_quantity') = 0, 'ALTER TABLE products ADD COLUMN stock_quantity DECIMAL(14,2) NOT NULL DEFAULT 0', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'analytic_accounts' AND column_name = 'is_archived') = 0, 'ALTER TABLE analytic_accounts ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT FALSE', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'purchase_order_lines' AND column_name = 'analytic_account_id') = 0, 'ALTER TABLE purchase_order_lines ADD COLUMN analytic_account_id INT NULL', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'sales_order_lines' AND column_name = 'analytic_account_id') = 0, 'ALTER TABLE sales_order_lines ADD COLUMN analytic_account_id INT NULL', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'customer_invoices' AND column_name = 'subtotal') = 0, 'ALTER TABLE customer_invoices ADD COLUMN subtotal DECIMAL(14,2) NOT NULL DEFAULT 0', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'customer_invoices' AND column_name = 'tax_total') = 0, 'ALTER TABLE customer_invoices ADD COLUMN tax_total DECIMAL(14,2) NOT NULL DEFAULT 0', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT IGNORE INTO accounts (name, type) VALUES ('Inventory', 'Asset'), ('Cost of Goods Sold', 'Expense');
UPDATE journals j JOIN accounts a ON a.name = 'Inventory' SET j.default_debit_account_id = a.id WHERE j.name = 'Purchase Journal' AND j.type = 'Purchase';

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
