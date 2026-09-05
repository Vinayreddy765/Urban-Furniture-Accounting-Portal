import React, { useState } from 'react';
import { Archive, ArchiveRestore, Plus } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import { useAuth, ROLES } from '../context/AuthContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import { Field, Input, Select, Button, Badge } from '../components/Field.jsx';
import { formatCurrency } from '../utils/format.js';

const EMPTY = { name: '', type: 'Asset' };
const TONE = { Asset: 'good', Liability: 'bad', Income: 'good', Expense: 'bad', Capital: 'brass' };

export default function ChartOfAccounts() {
  const { accounts, addAccount, archiveAccount, accountBalance } = useData();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const handleSubmit = (e) => {
    e.preventDefault();
    addAccount(form).then(() => { setForm(EMPTY); setOpen(false); }).catch(error => window.alert(error.message));
  };

  const grouped = ['Asset', 'Liability', 'Income', 'Expense', 'Capital'].map((type) => ({
    type,
    accounts: accounts.filter((a) => a.type === type),
  }));

  return (
    <div>
      <PageHeader title="Chart of Accounts" description="The master list of ledger accounts every transaction posts against.">
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} className="mr-1 inline" /> New account
        </Button>
      </PageHeader>

      <div className="space-y-6">
        {grouped.map(
          (g) =>
            g.accounts.length > 0 && (
              <div key={g.type}>
                <h3 className="mb-2 flex items-center gap-2 font-display text-lg text-ink">
                  {g.type} <Badge tone={TONE[g.type]}>{g.accounts.length}</Badge>
                </h3>
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th>Account name</th>
                      <th className="text-right">Current balance</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.accounts.map((a) => (
                      <tr key={a.id}>
                        <td className="text-ink">{a.name}</td>
                        <td className="text-right font-num">{formatCurrency(accountBalance(a.id))}</td>
                        <td className="text-right">{user?.role === ROLES.ADMIN && <button onClick={() => archiveAccount(a.id, !a.archived)} className="text-inksoft hover:text-brick" aria-label={a.archived ? `Restore ${a.name}` : `Archive ${a.name}`}>{a.archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New account">
        <form onSubmit={handleSubmit}>
          <Field label="Account name">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Type">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option>Asset</option>
              <option>Liability</option>
              <option>Income</option>
              <option>Expense</option>
              <option>Capital</option>
            </Select>
          </Field>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add account</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
