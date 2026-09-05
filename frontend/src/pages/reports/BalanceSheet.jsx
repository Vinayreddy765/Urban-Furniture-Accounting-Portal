import React, { useEffect, useState } from 'react';
import { useData } from '../../context/DataContext.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import { formatCurrency } from '../../utils/format.js';

export default function BalanceSheet() {
  const { getReport } = useData();
  const [from, setFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { let active = true; getReport('/reports/balance-sheet', from, to).then(value => { if (active) { setReport(value); setError(''); } }).catch(err => { if (active) setError(err.message); }); return () => { active = false; }; }, [getReport, from, to]);
  const accounts = report?.accounts || [];

  const assets = accounts.filter((a) => a.type === 'Asset');
  const liabilities = accounts.filter((a) => a.type === 'Liability');
  const capital = accounts.filter((a) => a.type === 'Capital');

  const balance = (account) => Number(account.balance || 0);
  const totalAssets = Number(report?.totals?.assets || 0);
  const totalLiabilities = Number(report?.totals?.liabilities || 0);
  const totalCapital = Number(report?.totals?.capital || 0);

  // net profit retained is folded into capital side so both totals match
  const retainedEarnings = Number(report?.totals?.currentProfit || 0);

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
              <td className="text-right font-num">{formatCurrency(balance(a))}</td>
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
      <PageHeader title="Balance Sheet" description="Real-time snapshot of what the business owns, owes, and is worth.">
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="rounded-sm border border-line bg-surface px-3 py-2 text-sm" />
        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="rounded-sm border border-line bg-surface px-3 py-2 text-sm" />
      </PageHeader>
      {error && <p className="mb-4 border border-brick bg-brick-light px-3 py-2 text-sm text-brick">{error}</p>}

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
