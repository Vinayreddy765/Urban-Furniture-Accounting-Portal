import React, { useState } from 'react';
import { Plus, Archive, ArchiveRestore, Pencil, Search } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';
import { Field, Input, Select, Button, Badge } from '../components/Field.jsx';

const EMPTY = { name: '', type: 'Customer', email: '', mobile: '', city: '', state: '', pincode: '' };

export default function Contacts() {
  const { contacts, addContact, updateContact, archiveContact } = useData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (contact) => {
    setEditing(contact);
    setForm(contact);
    setOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim();
    const mobile = form.mobile.trim();
    const pincode = form.pincode.trim();
    if (name.length < 2 || name.length > 120) return alert('Name must be between 2 and 120 characters.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return alert('Enter a valid email address.');
    if (!/^[6-9]\d{9}$/.test(mobile)) return alert('Enter a valid 10-digit Indian mobile number.');
    if (pincode && !/^\d{6}$/.test(pincode)) return alert('Pincode must contain exactly 6 digits.');
    const payload = { ...form, name, email, mobile, pincode };
    try {
      if (editing) await updateContact(editing.id, payload);
      else await addContact(payload);
      setOpen(false);
    } catch (err) { alert(err.message); }
  };

  const visible = contacts.filter((c) => !!c.archived === showArchived && `${c.name} ${c.email} ${c.mobile}`.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const paged = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <PageHeader title={`Contacts (${visible.length})`} description="Vendors, customers, and combined contacts used across purchases and sales.">
        <div className="relative mr-2"><Search size={15} className="absolute left-2 top-2.5 text-inksoft" /><Input className="w-56 pl-7" placeholder="Search contacts…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
        <Button variant="secondary" onClick={() => setShowArchived((s) => !s)}>
          {showArchived ? 'View active' : 'View archived'}
        </Button>
        <Button onClick={openNew}>
          <Plus size={16} className="mr-1 inline" /> New contact
        </Button>
      </PageHeader>

      {visible.length === 0 ? (
        <EmptyState label={showArchived ? 'No archived contacts.' : 'No contacts yet — add your first vendor or customer.'} />
      ) : (
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>Location</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paged.map((c) => (
              <tr key={c.id}>
                <td className="font-medium text-ink">{c.name}</td>
                <td>
                  <Badge tone={c.type === 'Vendor' ? 'brick' : c.type === 'Customer' ? 'good' : 'brass'}>{c.type}</Badge>
                </td>
                <td className="text-inksoft">{c.email}</td>
                <td className="text-inksoft">{c.mobile}</td>
                <td className="text-inksoft">{[c.city, c.state].filter(Boolean).join(', ')}</td>
                <td className="text-right">
                  <button onClick={() => openEdit(c)} className="mr-3 text-inksoft hover:text-walnut" aria-label={`Edit ${c.name}`}>
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => archiveContact(c.id, !c.archived)}
                    className="text-inksoft hover:text-brick"
                    aria-label={c.archived ? `Restore ${c.name}` : `Archive ${c.name}`}
                  >
                    {c.archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {visible.length > PAGE_SIZE && <div className="mt-4 flex items-center justify-between text-sm text-inksoft"><span>Page {page} of {totalPages}</span><div className="flex gap-2"><Button variant="secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button><Button variant="secondary" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button></div></div>}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit contact' : 'New contact'}>
        <form onSubmit={handleSubmit}>
          <Field label="Name">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Type">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option>Customer</option>
              <option>Vendor</option>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Mobile">
              <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="City">
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </Field>
            <Field label="State">
              <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </Field>
            <Field label="Pincode">
              <Input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
            </Field>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editing ? 'Save changes' : 'Add contact'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
