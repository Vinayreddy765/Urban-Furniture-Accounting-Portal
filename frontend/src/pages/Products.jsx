import React, { useState } from 'react';
import { Plus, Archive, ArchiveRestore, Pencil, Search } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';
import { Field, Input, Select, Button } from '../components/Field.jsx';
import { formatCurrency } from '../utils/format.js';

const EMPTY = { name: '', type: 'Goods', salesPrice: '', cost: '', category: '' };

export default function Products() {
  const { products, addProduct, updateProduct, archiveProduct } = useData();
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

  const openEdit = (p) => {
    setEditing(p);
    setForm(p);
    setOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    const salesPrice = Number(form.salesPrice);
    const cost = Number(form.cost);
    if (name.length < 2 || name.length > 160) return alert('Product name must be between 2 and 160 characters.');
    if (!Number.isFinite(salesPrice) || salesPrice <= 0) return alert('Sales price must be greater than 0.');
    if (!Number.isFinite(cost) || cost < 0) return alert('Cost cannot be negative.');
    const payload = { ...form, name, salesPrice, cost };
    try { if (editing) await updateProduct(editing.id, payload); else await addProduct(payload); setOpen(false); } catch (err) { alert(err.message); }
  };

  const visible = products.filter((p) => !!p.archived === showArchived && `${p.name} ${p.category}`.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const paged = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <PageHeader title={`Products (${visible.length})`} description="Goods, services, and combo items sold or purchased.">
        <div className="relative mr-2"><Search size={15} className="absolute left-2 top-2.5 text-inksoft" /><Input className="w-56 pl-7" placeholder="Search products…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
        <Button variant="secondary" onClick={() => setShowArchived((s) => !s)}>
          {showArchived ? 'View active' : 'View archived'}
        </Button>
        <Button onClick={openNew}>
          <Plus size={16} className="mr-1 inline" /> New product
        </Button>
      </PageHeader>

      {visible.length === 0 ? (
        <EmptyState label={showArchived ? 'No archived products.' : 'No products yet — add your first item.'} />
      ) : (
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Type</th>
              <th>Category</th>
              <th className="text-right">Sales price</th>
              <th className="text-right">Cost</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paged.map((p) => (
              <tr key={p.id}>
                <td className="font-medium text-ink">{p.name}</td>
                <td className="text-inksoft">{p.type}</td>
                <td className="text-inksoft">{p.category}</td>
                <td className="text-right font-num">{formatCurrency(p.salesPrice)}</td>
                <td className="text-right font-num text-inksoft">{formatCurrency(p.cost)}</td>
                <td className="text-right">
                  <button onClick={() => openEdit(p)} className="mr-3 text-inksoft hover:text-walnut" aria-label={`Edit ${p.name}`}>
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => archiveProduct(p.id, !p.archived)}
                    className="text-inksoft hover:text-brick"
                    aria-label={p.archived ? `Restore ${p.name}` : `Archive ${p.name}`}
                  >
                    {p.archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {visible.length > PAGE_SIZE && <div className="mt-4 flex items-center justify-between text-sm text-inksoft"><span>Page {page} of {totalPages}</span><div className="flex gap-2"><Button variant="secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button><Button variant="secondary" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button></div></div>}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit product' : 'New product'}>
        <form onSubmit={handleSubmit}>
          <Field label="Product name">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option>Goods</option>
                <option>Service</option>
                <option>Combo</option>
              </Select>
            </Field>
            <Field label="Category">
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sales price (₹)">
              <Input type="number" min="0" required value={form.salesPrice} onChange={(e) => setForm({ ...form, salesPrice: e.target.value })} />
            </Field>
            <Field label="Cost / purchase price (₹)">
              <Input type="number" min="0" required value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            </Field>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editing ? 'Save changes' : 'Add product'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
