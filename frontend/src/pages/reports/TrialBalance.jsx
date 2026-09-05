import React, { useEffect, useState } from 'react';
import { useData } from '../../context/DataContext.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { Badge } from '../../components/Field.jsx';
import { formatCurrency } from '../../utils/format.js';

export default function TrialBalance() {
  const { getReport } = useData();
  const [from, setFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { let active = true; getReport('/reports/trial-balance', from, to).then(value => { if (active) { setReport(value); setError(''); } }).catch(err => { if (active) setError(err.message); }); return () => { active = false; }; }, [getReport, from, to]);
  const accounts = report?.accounts || [];
  const balanced = Math.abs(Number(report?.totalDebit || 0) - Number(report?.totalCredit || 0)) <= 0.005;

  return <div>
    <PageHeader title="Trial Balance" description="Debit and credit totals for the selected reporting period.">
      <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="rounded-sm border border-line bg-surface px-3 py-2 text-sm" />
      <input type="date" value={to} onChange={e => setTo(e.target.value)} className="rounded-sm border border-line bg-surface px-3 py-2 text-sm" />
    </PageHeader>
    {error && <p className="mb-4 border border-brick bg-brick-light px-3 py-2 text-sm text-brick">{error}</p>}
    {accounts.length === 0 ? <EmptyState label="No ledger activity in this period." /> : <>
      <div className="mb-4 flex items-center justify-between border border-line bg-surface px-5 py-3 text-sm"><span>Total debit: <strong>{formatCurrency(report.totalDebit)}</strong></span><span>Total credit: <strong>{formatCurrency(report.totalCredit)}</strong></span><Badge tone={balanced ? 'good' : 'bad'}>{balanced ? 'Balanced' : 'Out of balance'}</Badge></div>
      <table className="ledger-table"><thead><tr><th>Account</th><th>Type</th><th className="text-right">Debit</th><th className="text-right">Credit</th></tr></thead><tbody>{accounts.map(account => <tr key={account.id}><td className="font-medium text-ink">{account.name}</td><td className="text-inksoft">{account.type}</td><td className="text-right font-num">{formatCurrency(account.debit)}</td><td className="text-right font-num">{formatCurrency(account.credit)}</td></tr>)}</tbody></table>
    </>}
  </div>;
}
