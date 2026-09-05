import React, { useState } from 'react';
import { Archive, ArchiveRestore, Plus } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import { useAuth, ROLES } from '../context/AuthContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import { Field, Input, Select, Button } from '../components/Field.jsx';

const EMPTY = { name: '', type: 'Sales', defaultDebitAccountId: '', defaultCreditAccountId: '', cashOrBankAccountId: '' };

export default function Journals() {
  const { journals, accounts, addJournal, archiveJournal } = useData();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const requiresDefaults = ['Sales', 'Purchase'].includes(form.type);
    if ((requiresDefaults && (!form.defaultDebitAccountId || !form.defaultCreditAccountId)) || (!requiresDefaults && !form.cashOrBankAccountId)) return window.alert('Select the required journal accounts.');
    try { await addJournal({ ...form, defaultDebitAccountId: requiresDefaults ? Number(form.defaultDebitAccountId) : null, defaultCreditAccountId: requiresDefaults ? Number(form.defaultCreditAccountId) : null, cashOrBankAccountId: requiresDefaults ? null : Number(form.cashOrBankAccountId) }); setForm(EMPTY); setOpen(false); } catch (error) { window.alert(error.message); }
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
              <th>Default accounts</th>
              <th></th>
          </tr>
        </thead>
        <tbody>
          {journals.map((j) => (
            <tr key={j.id}>
              <td className="font-medium text-ink">{j.name}</td>
              <td className="text-inksoft">{j.type}</td>
              <td className="text-inksoft">{[j.defaultDebitAccountId, j.defaultCreditAccountId, j.cashOrBankAccountId].filter(Boolean).map(id => accounts.find(a => Number(a.id) === Number(id))?.name).filter(Boolean).join(' / ') || '—'}</td>
              <td className="text-right">{user?.role === ROLES.ADMIN && <button onClick={() => archiveJournal(j.id, !j.archived)} className="text-inksoft hover:text-brick" aria-label={j.archived ? `Restore ${j.name}` : `Archive ${j.name}`}>{j.archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}</button>}</td>
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
          {['Sales', 'Purchase'].includes(form.type) ? <>
          <Field label="Default debit account">
            <Select required value={form.defaultDebitAccountId} onChange={(e) => setForm({ ...form, defaultDebitAccountId: e.target.value })}>
              <option value="">Select an account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Default credit account">
            <Select required value={form.defaultCreditAccountId} onChange={(e) => setForm({ ...form, defaultCreditAccountId: e.target.value })}>
              <option value="">Select an account</option>
              {accounts.filter(a => !a.archived).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
          </> : <Field label="Cash or bank account">
            <Select required value={form.cashOrBankAccountId} onChange={(e) => setForm({ ...form, cashOrBankAccountId: e.target.value })}>
              <option value="">Select an account</option>
              {accounts.filter(a => !a.archived && a.type === 'Asset').map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>}
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
