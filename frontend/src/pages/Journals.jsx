import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import { Field, Input, Select, Button } from '../components/Field.jsx';

const EMPTY = { name: '', type: 'Sales', defaultAccountId: '' };

export default function Journals() {
  const { journals, accounts, addJournal } = useData();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const handleSubmit = (e) => {
    e.preventDefault();
    addJournal(form);
    setForm(EMPTY);
    setOpen(false);
  };

  return (
    <div>
      <PageHeader title="Journals" description="Groups of similar transactions — sales, purchases, bank, and cash activity.">
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} className="mr-1 inline" /> New journal
        </Button>
      </PageHeader>

      <table className="ledger-table">
        <thead>
          <tr>
            <th>Journal name</th>
            <th>Type</th>
            <th>Default account</th>
          </tr>
        </thead>
        <tbody>
          {journals.map((j) => (
            <tr key={j.id}>
              <td className="font-medium text-ink">{j.name}</td>
              <td className="text-inksoft">{j.type}</td>
              <td className="text-inksoft">{accounts.find((a) => a.id === j.defaultAccountId)?.name || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal open={open} onClose={() => setOpen(false)} title="New journal">
        <form onSubmit={handleSubmit}>
          <Field label="Journal name">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Type">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option>Sales</option>
              <option>Purchase</option>
              <option>Bank</option>
              <option>Cash</option>
            </Select>
          </Field>
          <Field label="Default account">
            <Select required value={form.defaultAccountId} onChange={(e) => setForm({ ...form, defaultAccountId: e.target.value })}>
              <option value="">Select an account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add journal</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
