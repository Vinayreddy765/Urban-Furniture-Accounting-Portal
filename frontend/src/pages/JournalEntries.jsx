import React from 'react';
import { useData } from '../context/DataContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { Badge } from '../components/Field.jsx';
import { formatCurrency, formatDate } from '../utils/format.js';

export default function JournalEntries() {
  const { journalEntries } = useData();

  return (
    <div>
      <PageHeader title="Journal Entries" description="Posted double-entry records created by bills, invoices, payments, and manual entries." />
      {journalEntries.length === 0 ? <EmptyState label="No journal entries yet." /> : (
        <table className="ledger-table">
          <thead><tr><th>Date</th><th>Reference</th><th>Source</th><th>Journal</th><th className="text-right">Debit</th><th className="text-right">Credit</th><th>Status</th></tr></thead>
          <tbody>{journalEntries.map((entry) => {
            const debit = (entry.lines || []).reduce((sum, line) => sum + Number(line.debit || 0), 0);
            const credit = (entry.lines || []).reduce((sum, line) => sum + Number(line.credit || 0), 0);
            return <tr key={entry.id}>
              <td className="text-inksoft">{formatDate(entry.entry_date)}</td>
              <td className="text-ink">{entry.reference || `Entry #${entry.id}`}</td>
              <td className="text-inksoft">{entry.source_type}</td>
              <td className="text-inksoft">{entry.journal_name}</td>
              <td className="text-right font-num">{formatCurrency(debit)}</td>
              <td className="text-right font-num">{formatCurrency(credit)}</td>
              <td><Badge tone={Math.abs(debit - credit) <= 0.005 ? 'good' : 'bad'}>{Math.abs(debit - credit) <= 0.005 ? 'Balanced' : 'Unbalanced'}</Badge></td>
            </tr>;
          })}</tbody>
        </table>
      )}
    </div>
  );
}
