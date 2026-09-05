import React from 'react';
import { useData } from '../../context/DataContext.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import { formatCurrency } from '../../utils/format.js';

export default function BalanceSheet() {
  const { accounts, accountBalance } = useData();

  const assets = accounts.filter((a) => a.type === 'Asset');
  const liabilities = accounts.filter((a) => a.type === 'Liability');
  const capital = accounts.filter((a) => a.type === 'Capital');

  const totalAssets = assets.reduce((s, a) => s + accountBalance(a.id), 0);
  const totalLiabilities = liabilities.reduce((s, a) => s + accountBalance(a.id), 0);
  const totalCapital = capital.reduce((s, a) => s + accountBalance(a.id), 0);

  // net profit retained is folded into capital side so both totals match
  const retainedEarnings = totalAssets - totalLiabilities - totalCapital;

  const Column = ({ title, rows, total, extraRow }) => (
    <div className="border border-line bg-surface">
      <div className="border-b border-ink/80 px-5 py-3">
        <h3 className="font-display text-lg text-ink">{title}</h3>
      </div>
      <table className="ledger-table">
        <tbody>
          {rows.map((a) => (
            <tr key={a.id}>
              <td className="text-ink">{a.name}</td>
              <td className="text-right font-num">{formatCurrency(accountBalance(a.id))}</td>
            </tr>
          ))}
          {extraRow && (
            <tr>
              <td className="text-ink">{extraRow.label}</td>
              <td className="text-right font-num">{formatCurrency(extraRow.value)}</td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="flex justify-between border-t border-ink/80 px-5 py-3 text-sm font-medium">
        <span className="text-ink">Total</span>
        <span className="font-num text-ink">{formatCurrency(total)}</span>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader title="Balance Sheet" description="Real-time snapshot of what the business owns, owes, and is worth." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Column title="Assets" rows={assets} total={totalAssets} />
        <div className="space-y-6">
          <Column title="Liabilities" rows={liabilities} total={totalLiabilities} />
          <Column
            title="Capital"
            rows={capital}
            total={totalCapital + retainedEarnings}
            extraRow={{ label: 'Retained earnings (net profit)', value: retainedEarnings }}
          />
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-inksoft">
        Assets ({formatCurrency(totalAssets)}) = Liabilities + Capital ({formatCurrency(totalLiabilities + totalCapital + retainedEarnings)})
      </p>
    </div>
  );
}
