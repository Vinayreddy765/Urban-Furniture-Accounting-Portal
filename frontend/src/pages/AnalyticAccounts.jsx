import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import { Field, Input, Select, Button } from '../components/Field.jsx';

const EMPTY = { name: '', type: 'Expense' };

export default function AnalyticAccounts() {
  const { analyticAccounts, addAnalyticAccount } = useData();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const handleSubmit = (e) => {
    e.preventDefault();
    addAnalyticAccount(form);
    setForm(EMPTY);
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Analytic Accounts"
        description="Markers used to track income or expense for a project, department, or division — the backbone of budgets."
      >
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} className="mr-1 inline" /> New analytic account
        </Button>
      </PageHeader>

      <table className="ledger-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          {analyticAccounts.map((a) => (
            <tr key={a.id}>
              <td className="font-medium text-ink">{a.name}</td>
              <td className="text-inksoft">{a.type}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal open={open} onClose={() => setOpen(false)} title="New analytic account">
        <form onSubmit={handleSubmit}>
          <Field label="Name">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Type">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option>Income</option>
              <option>Expense</option>
            </Select>
          </Field>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add analytic account</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
