import React, { useEffect, useState } from 'react';
import { Plus, UserCheck, UserX } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';
import { Field, Input, Select, Button, Badge } from '../components/Field.jsx';

const EMPTY = { name: '', loginId: '', email: '', password: '', role: 'User', contactId: '' };

export default function Users() {
  const { users, loadUsers, createUser, setUserActive } = useAuth();
  const { contacts } = useData();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  useEffect(() => { loadUsers().catch(err => setError(err.message)); }, [loadUsers]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (form.password.length < 9 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9])/.test(form.password)) return setError('Password must be more than 8 characters and contain lowercase, uppercase, and special characters.');
    if (form.role === 'User' && !form.contactId) return setError('Select a contact for a portal User.');
    try {
      await createUser({ ...form, contactId: form.role === 'User' ? Number(form.contactId) : undefined });
      setForm(EMPTY);
      setOpen(false);
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <PageHeader title="Users" description="Manage Administrator, Accountant, and Contact portal access.">
        <Button onClick={() => { setError(''); setOpen(true); }}><Plus size={16} className="mr-1 inline" /> New user</Button>
      </PageHeader>
      {error && <p className="mb-4 border border-brick bg-brick-light px-3 py-2 text-sm text-brick">{error}</p>}
      {users.length === 0 ? <EmptyState label="No users found." /> : (
        <table className="ledger-table">
          <thead><tr><th>Name</th><th>Login Id</th><th>Email</th><th>Role</th><th>Contact</th><th>Status</th><th></th></tr></thead>
          <tbody>{users.map(item => <tr key={item.id}>
            <td className="font-medium text-ink">{item.name}</td><td className="text-inksoft">{item.loginId}</td><td className="text-inksoft">{item.email}</td><td className="text-inksoft">{item.role}</td><td className="text-inksoft">{item.contactName || '-'}</td>
            <td><Badge tone={item.isActive ? 'good' : 'bad'}>{item.isActive ? 'Active' : 'Inactive'}</Badge></td>
            <td className="text-right"><button onClick={() => setUserActive(item.id, !item.isActive).catch(err => setError(err.message))} className="text-inksoft hover:text-walnut" aria-label={`${item.isActive ? 'Deactivate' : 'Activate'} ${item.name}`}>{item.isActive ? <UserX size={15} /> : <UserCheck size={15} />}</button></td>
          </tr>)}</tbody>
        </table>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="New user">
        <form onSubmit={handleSubmit}>
          <Field label="Name"><Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Login Id"><Input required minLength="6" maxLength="12" pattern="[A-Za-z0-9._\-]+" value={form.loginId} onChange={e => setForm({ ...form, loginId: e.target.value })} /></Field>
          <Field label="Email"><Input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Role"><Select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option>Administrator</option><option>Accountant</option><option>User</option></Select></Field>
          {form.role === 'User' && <Field label="Contact"><Select required value={form.contactId} onChange={e => setForm({ ...form, contactId: e.target.value })}><option value="">Select contact</option>{contacts.filter(contact => !contact.archived).map(contact => <option key={contact.id} value={contact.id}>{contact.name} ({contact.type})</option>)}</Select></Field>}
          <Field label="Password"><Input required type="password" minLength="9" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></Field>
          <div className="mt-2 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit">Create user</Button></div>
        </form>
      </Modal>
    </div>
  );
}
