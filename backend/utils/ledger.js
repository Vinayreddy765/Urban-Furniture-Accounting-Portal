const AppError = require('./AppError');

/**
 * The only function allowed to write accounting journal entries. Call it while
 * the caller owns an open DB transaction so the source document and ledger
 * entry commit/rollback together.
 */
async function postJournalEntry(conn, { journalId, entryDate, reference, sourceType, sourceId, lines }) {
  if (!lines || lines.length < 2) throw new AppError('A journal entry needs at least two lines', 422);

  const [[journal]] = await conn.query('SELECT id FROM journals WHERE id=? AND is_archived=FALSE', [journalId]);
  if (!journal) throw new AppError('Selected journal does not exist or is archived', 422);

  const accountIds = [...new Set(lines.map(l => Number(l.accountId)))];
  if (accountIds.some(id => !Number.isInteger(id) || id <= 0)) throw new AppError('Every journal line needs a valid account', 422);
  const [accounts] = await conn.query(`SELECT id FROM accounts WHERE id IN (?) AND is_archived=FALSE`, [accountIds]);
  if (accounts.length !== accountIds.length) throw new AppError('Journal entry contains an invalid or archived account', 422);

  const analyticIds = [...new Set(lines.filter(l => l.analyticAccountId !== undefined && l.analyticAccountId !== null).map(l => Number(l.analyticAccountId)))];
    if (analyticIds.some(id => !Number.isInteger(id) || id <= 0)) throw new AppError('Every analytic account must be valid', 422);
    if (analyticIds.length) {
      const [analyticAccounts] = await conn.query('SELECT id FROM analytic_accounts WHERE id IN (?) AND is_archived=FALSE', [analyticIds]);
      if (analyticAccounts.length !== analyticIds.length) throw new AppError('Journal entry contains an invalid or archived analytic account', 422);
    }

  for (const line of lines) {
    const debit = Number(line.debit || 0);
    const credit = Number(line.credit || 0);
    if (!Number.isFinite(debit) || !Number.isFinite(credit) || debit < 0 || credit < 0 || (debit > 0 && credit > 0)) {
      throw new AppError('Each journal line must contain a non-negative debit OR credit amount', 422);
    }
  }

  const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
  if (totalDebit <= 0 || Math.abs(totalDebit - totalCredit) > 0.005) {
    throw new AppError(`Journal entry is not balanced: total debit (${totalDebit.toFixed(2)}) != total credit (${totalCredit.toFixed(2)})`, 422);
  }

  const [result] = await conn.query(
    `INSERT INTO journal_entries (journal_id, entry_date, reference, source_type, source_id) VALUES (?, ?, ?, ?, ?)`,
    [journalId, entryDate, reference || null, sourceType, sourceId || null]
  );
  const journalEntryId = result.insertId;
  for (const line of lines) {
    await conn.query(
      `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, analytic_account_id) VALUES (?, ?, ?, ?, ?)`,
      [journalEntryId, line.accountId, Number(line.debit || 0), Number(line.credit || 0), line.analyticAccountId || null]
    );
  }
  return journalEntryId;
}

module.exports = { postJournalEntry };
