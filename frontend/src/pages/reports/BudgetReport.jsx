import React, { useEffect, useState } from 'react';
import { useData } from '../../context/DataContext.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import { Badge } from '../../components/Field.jsx';
import { formatCurrency } from '../../utils/format.js';
import EmptyState from '../../components/EmptyState.jsx';

export default function BudgetReport() {
  const { getReport } = useData();
  const [from, setFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { let active = true; getReport('/reports/budget', from, to).then(value => { if (active) { setReport(value); setError(''); } }).catch(err => { if (active) setError(err.message); }); return () => { active = false; }; }, [getReport, from, to]);
  const budgets = report?.budgets || [];

  return (
    <div>
      <PageHeader title="Budget Report" description="Planned amounts against actual activity for each analytic account.">
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="rounded-sm border border-line bg-surface px-3 py-2 text-sm" />
        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="rounded-sm border border-line bg-surface px-3 py-2 text-sm" />
      </PageHeader>
      {error && <p className="mb-4 border border-brick bg-brick-light px-3 py-2 text-sm text-brick">{error}</p>}

      {budgets.length === 0 ? (
        <EmptyState label="No budgets set up yet." />
      ) : (
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Budget</th>
              <th>Analytic account</th>
              <th>Period</th>
              <th className="text-right">Planned</th>
              <th className="text-right">Actual</th>
              <th className="text-right">Variance</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {budgets.map((b) => {
              const planned = Number(b.planned_amount || 0);
              const actual = Number(b.actual_amount || 0);
              const variance = Number(b.variance || 0);
              const pct = planned ? Math.min(100, Math.round((actual / planned) * 100)) : 0;
              return (
                <tr key={b.id}>
                  <td className="font-medium text-ink">{b.name}</td>
                  <td className="text-inksoft">{b.analytic_account_name}</td>
                  <td className="text-inksoft">{b.period_start} to {b.period_end}</td>
                  <td className="text-right font-num">{formatCurrency(planned)}</td>
                  <td className="text-right font-num">{formatCurrency(actual)}</td>
                  <td className="text-right font-num">{formatCurrency(variance)}</td>
                  <td>
                    <Badge tone={variance >= 0 ? 'good' : 'bad'}>{pct}% used</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
