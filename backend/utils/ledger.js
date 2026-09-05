const AppError = require('./AppError');

/**
 * Posts a journal entry with N lines. Rejects if debits don't equal credits —
 * this is the one guard that keeps the whole ledger (and therefore every
 * report derived from it) trustworthy. Must be called with a connection
 * that already has a transaction open (conn.beginTransaction()), so the
 * caller can roll back the JE together with whatever business record
 * (bill/invoice/payment) triggered it.
 *
 * lines: [{ accountId, debit=0, credit=0, analyticAccountId=null }, ...]
 */
async function postJournalEntry(conn, { journalId, entryDate, reference, sourceType, sourceId, lines }) {
  if (!lines || lines.length < 2) {
    throw new AppError('A journal entry needs at least two lines', 422);
  }

  const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);

  // Guard against floating point drift with a small epsilon.
  if (Math.abs(totalDebit - totalCredit) > 0.005) {
    throw new AppError(
      `Journal entry is not balanced: total debit (${totalDebit.toFixed(2)}) != total credit (${totalCredit.toFixed(2)})`,
      422
    );
  }

  const [result] = await conn.query(
    `INSERT INTO journal_entries (journal_id, entry_date, reference, source_type, source_id)
     VALUES (?, ?, ?, ?, ?)`,
    [journalId, entryDate, reference || null, sourceType, sourceId || null]
  );

  const journalEntryId = result.insertId;

  for (const line of lines) {
    await conn.query(
      `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, analytic_account_id)
       VALUES (?, ?, ?, ?, ?)`,
      [journalEntryId, line.accountId, line.debit || 0, line.credit || 0, line.analyticAccountId || null]
    );
  }

  return journalEntryId;
}

module.exports = { postJournalEntry };
