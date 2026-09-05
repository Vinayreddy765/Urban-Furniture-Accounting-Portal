import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import { Field, Input, Select, Button, Badge } from '../components/Field.jsx';
import { formatCurrency } from '../utils/format.js';

const EMPTY = { name: '', periodStart: '', periodEnd: '', responsiblePerson: '', analyticAccountId: '', plannedAmount: '' };

function ActualCell({ budget, budgetActual }) {
  const [result, setResult] = useState({ planned: budget.plannedAmount, actual: 0, variance: budget.plannedAmount });
  useEffect(() => { let active = true; budgetActual(budget).then(value => { if (active) setResult(value); }); return () => { active = false; }; }, [budget, budgetActual]);
  return <><td className="text-right font-num">{formatCurrency(result.actual)} <Badge tone={result.variance >= 0 ? 'good' : 'bad'}>{result.variance >= 0 ? 'Under' : 'Over'}</Badge></td></>;
}

export default function Budgets() {
  const { budgets, analyticAccounts, addBudget, budgetActual } = useData();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.periodStart || !form.periodEnd || form.periodStart > form.periodEnd) return window.alert('Enter a valid budget period.');
    addBudget({ ...form, plannedAmount: Number(form.plannedAmount) }).then(() => { setForm(EMPTY); setOpen(false); }).catch(error => window.alert(error.message));
  };

  return (
    <div>
      <PageHeader title="Budgets" description="Planned amounts against analytic accounts, checked against actuals in the Budget Report.">
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} className="mr-1 inline" /> New budget
        </Button>
      </PageHeader>

      <table className="ledger-table">
        <thead>
          <tr>
            <th>Budget name</th>
            <th>Period</th>
            <th>Responsible</th>
            <th className="text-right">Planned</th>
            <th className="text-right">Actual so far</th>
          </tr>
        </thead>
        <tbody>
          {budgets.map((b) => {
            return (
              <tr key={b.id}>
                <td className="font-medium text-ink">{b.name}</td>
                <td className="text-inksoft">{b.periodStart} to {b.periodEnd}</td>
                <td className="text-inksoft">{b.responsiblePerson}</td>
                <td className="text-right font-num">{formatCurrency(b.plannedAmount)}</td>
                <ActualCell budget={b} budgetActual={budgetActual} />
              </tr>
            );
          })}
        </tbody>
      </table>

      <Modal open={open} onClose={() => setOpen(false)} title="New budget">
        <form onSubmit={handleSubmit}>
          <Field label="Budget name">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Period start">
              <Input type="date" required value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} />
            </Field>
            <Field label="Period end">
              <Input type="date" required value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} />
            </Field>
            <Field label="Responsible person">
              <Input required value={form.responsiblePerson} onChange={(e) => setForm({ ...form, responsiblePerson: e.target.value })} />
            </Field>
          </div>
          <Field label="Analytic account">
            <Select required value={form.analyticAccountId} onChange={(e) => setForm({ ...form, analyticAccountId: e.target.value })}>
              <option value="">Select an analytic account</option>
              {analyticAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Planned amount (₹)">
            <Input type="number" min="0" required value={form.plannedAmount} onChange={(e) => setForm({ ...form, plannedAmount: e.target.value })} />
          </Field>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add budget</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
