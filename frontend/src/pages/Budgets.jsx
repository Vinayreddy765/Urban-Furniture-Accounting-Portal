import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import { Field, Input, Select, Button, Badge } from '../components/Field.jsx';
import { formatCurrency } from '../utils/format.js';

const EMPTY = { name: '', period: '', responsible: '', analyticAccountId: '', plannedAmount: '' };

export default function Budgets() {
  const { budgets, analyticAccounts, addBudget, budgetActual } = useData();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const handleSubmit = (e) => {
    e.preventDefault();
    addBudget({ ...form, plannedAmount: Number(form.plannedAmount) });
    setForm(EMPTY);
    setOpen(false);
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
            const { planned, actual, variance } = budgetActual(b);
            return (
              <tr key={b.id}>
                <td className="font-medium text-ink">{b.name}</td>
                <td className="text-inksoft">{b.period}</td>
                <td className="text-inksoft">{b.responsible}</td>
                <td className="text-right font-num">{formatCurrency(planned)}</td>
                <td className="text-right font-num">
                  {formatCurrency(actual)}{' '}
                  <Badge tone={variance >= 0 ? 'good' : 'bad'}>{variance >= 0 ? 'Under' : 'Over'}</Badge>
                </td>
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
            <Field label="Period">
              <Input placeholder="e.g. Jul–Sep 2026" required value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} />
            </Field>
            <Field label="Responsible person">
              <Input required value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} />
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
