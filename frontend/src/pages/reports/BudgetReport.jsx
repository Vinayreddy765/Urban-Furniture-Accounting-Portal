import React from 'react';
import { useData } from '../../context/DataContext.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import { Badge } from '../../components/Field.jsx';
import { formatCurrency } from '../../utils/format.js';
import EmptyState from '../../components/EmptyState.jsx';

export default function BudgetReport() {
  const { budgets, analyticAccounts, budgetActual } = useData();

  return (
    <div>
      <PageHeader title="Budget Report" description="Planned amounts against actual activity for each analytic account." />

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
              const analytic = analyticAccounts.find((a) => a.id === b.analyticAccountId);
              const { planned, actual, variance } = budgetActual(b);
              const pct = planned ? Math.min(100, Math.round((actual / planned) * 100)) : 0;
              return (
                <tr key={b.id}>
                  <td className="font-medium text-ink">{b.name}</td>
                  <td className="text-inksoft">{analytic?.name}</td>
                  <td className="text-inksoft">{b.period}</td>
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
