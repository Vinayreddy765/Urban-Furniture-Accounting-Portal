import React from 'react';
import { useData } from '../../context/DataContext.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import { formatCurrency } from '../../utils/format.js';

export default function ProfitLoss() {
  const { accounts, accountBalance } = useData();

  const income = accounts.filter((a) => a.type === 'Income');
  const expense = accounts.filter((a) => a.type === 'Expense');

  const totalIncome = income.reduce((s, a) => s + accountBalance(a.id), 0);
  const totalExpense = expense.reduce((s, a) => s + accountBalance(a.id), 0);
  const netProfit = totalIncome - totalExpense;

  return (
    <div>
      <PageHeader title="Profit & Loss" description="Income from sales, less purchases and expenses, over all recorded activity." />

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
                <td className="text-right font-num">{formatCurrency(accountBalance(a.id))}</td>
              </tr>
            ))}
            <tr>
              <td className="pt-4 font-medium text-ink">Expenses</td>
              <td className="pt-4"></td>
            </tr>
            {expense.map((a) => (
              <tr key={a.id}>
                <td className="pl-6 text-ink">{a.name}</td>
                <td className="text-right font-num">({formatCurrency(accountBalance(a.id))})</td>
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
