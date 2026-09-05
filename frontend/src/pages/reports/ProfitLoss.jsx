import React, { useEffect, useState } from 'react';
import { useData } from '../../context/DataContext.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import { formatCurrency } from '../../utils/format.js';

export default function ProfitLoss() {
  const { getReport } = useData();
  const [from, setFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { let active = true; getReport('/reports/profit-loss', from, to).then(value => { if (active) { setReport(value); setError(''); } }).catch(err => { if (active) setError(err.message); }); return () => { active = false; }; }, [getReport, from, to]);
  const accounts = report?.accounts || [];

  const income = accounts.filter((a) => a.type === 'Income');
  const expense = accounts.filter((a) => a.type === 'Expense');

  const totalIncome = Number(report?.totals?.income || 0);
  const totalExpense = Number(report?.totals?.expenses || 0);
  const netProfit = Number(report?.totals?.netProfit || 0);

  return (
    <div>
      <PageHeader title="Profit & Loss" description="Income from sales, less purchases and expenses, over the selected period.">
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="rounded-sm border border-line bg-surface px-3 py-2 text-sm" />
        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="rounded-sm border border-line bg-surface px-3 py-2 text-sm" />
      </PageHeader>
      {error && <p className="mb-4 border border-brick bg-brick-light px-3 py-2 text-sm text-brick">{error}</p>}

      <div className="border border-line bg-surface">
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Account</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="pt-4 font-medium text-ink">Income</td>
              <td className="pt-4"></td>
            </tr>
            {income.map((a) => (
              <tr key={a.id}>
                <td className="pl-6 text-ink">{a.name}</td>
                <td className="text-right font-num">{formatCurrency(a.amount)}</td>
              </tr>
            ))}
            <tr>
              <td className="pt-4 font-medium text-ink">Expenses</td>
              <td className="pt-4"></td>
            </tr>
            {expense.map((a) => (
              <tr key={a.id}>
                <td className="pl-6 text-ink">{a.name}</td>
                <td className="text-right font-num">({formatCurrency(a.amount)})</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-ink/80 px-5 py-4">
          <span className="font-display text-lg text-ink">Net Profit</span>
          <span className={`font-num text-xl font-medium ${netProfit >= 0 ? 'text-sage' : 'text-brick'}`}>
            {formatCurrency(netProfit)}
          </span>
        </div>
      </div>
    </div>
  );
}
