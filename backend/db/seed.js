// Seeds the minimum Chart of Accounts + Journals every posting rule depends on,
// plus one Administrator login so you can sign in immediately.
// Run: npm run seed
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const ACCOUNTS = [
  { name: 'Cash', type: 'Asset' },
  { name: 'Bank', type: 'Asset' },
  { name: 'Debtors', type: 'Asset' },
  { name: 'Creditors', type: 'Liability' },
  { name: 'Tax Payable', type: 'Liability' },
  { name: 'Sales Income', type: 'Income' },
  { name: 'Purchase Expense', type: 'Expense' },
  { name: 'Inventory', type: 'Asset' },
  { name: 'Cost of Goods Sold', type: 'Expense' },
  { name: 'Capital', type: 'Capital' },
];

async function seed() {
  const conn = await pool.getConnection();
  try {
    for (const a of ACCOUNTS) {
      await conn.query('INSERT IGNORE INTO accounts (name, type) VALUES (?, ?)', [a.name, a.type]);
    }

    const idOf = async (name) => {
      const [[row]] = await conn.query('SELECT id FROM accounts WHERE name = ?', [name]);
      return row.id;
    };

    const inventory = await idOf('Inventory');
    const creditors = await idOf('Creditors');
    const debtors = await idOf('Debtors');
    const salesIncome = await idOf('Sales Income');
    const bank = await idOf('Bank');
    const cash = await idOf('Cash');

    const JOURNALS = [
      { name: 'Purchase Journal', type: 'Purchase', debit: inventory, credit: creditors, cashBank: null },
      { name: 'Sales Journal', type: 'Sales', debit: debtors, credit: salesIncome, cashBank: null },
      { name: 'Bank Journal', type: 'Bank', debit: null, credit: null, cashBank: bank },
      { name: 'Cash Journal', type: 'Cash', debit: null, credit: null, cashBank: cash },
    ];

    for (const j of JOURNALS) {
      const [[existing]] = await conn.query('SELECT id FROM journals WHERE name = ?', [j.name]);
      if (!existing) {
        await conn.query(
          `INSERT INTO journals (name, type, default_debit_account_id, default_credit_account_id, cash_or_bank_account_id)
           VALUES (?, ?, ?, ?, ?)`,
          [j.name, j.type, j.debit, j.credit, j.cashBank]
        );
      } else if (j.name === 'Purchase Journal') {
        await conn.query('UPDATE journals SET default_debit_account_id = ?, default_credit_account_id = ? WHERE id = ?', [j.debit, j.credit, existing.id]);
      }
    }

    const passwordHash = await bcrypt.hash('Admin@12345', 10);
    await conn.query(
      `INSERT IGNORE INTO users (name, login_id, email, password_hash, role)
       VALUES (?, ?, ?, ?, 'Administrator')`,
      ['Business Owner', 'admin01', 'admin@urbanfurniture.dev', passwordHash]
    );

    console.log('Seed complete.');
    console.log('Administrator login -> login_id: admin01 / password: Admin@12345');
  } catch (err) {
    console.error('Seed failed:', err.message);
  } finally {
    conn.release();
    process.exit(0);
  }
}

seed();
