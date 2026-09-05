import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';
import LineItemsEditor from '../components/LineItemsEditor.jsx';
import { Field, Select, Input, Button, Badge } from '../components/Field.jsx';
import { formatCurrency, formatDate } from '../utils/format.js';

const STATUS_TONE = { Draft: 'neutral', Invoiced: 'brass' };

export default function SalesOrders() {
  const { salesOrders, contacts, products, createSalesOrder, generateInvoiceFromSO, confirmSalesOrder } = useData();
  const [open, setOpen] = useState(false);
  const [invoiceModal, setInvoiceModal] = useState(null);
  const [customerId, setCustomerId] = useState('');
  const [taxRate, setTaxRate] = useState(18);
  const [lines, setLines] = useState([]);
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  const customers = contacts.filter((c) => c.type === 'Customer' && !c.archived);
  const activeProducts = products.filter((p) => !p.archived);

  const openNew = () => {
    setCustomerId('');
    setLines([]);
    setTaxRate(18);
    setOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!lines.length || lines.some(l => !l.productId || Number(l.quantity) <= 0 || Number(l.unitPrice) < 0)) return alert('Add at least one valid product line with quantity greater than 0.');
    try { await createSalesOrder({ customerId, lines, taxRate: Number(taxRate) }); setOpen(false); } catch (err) { alert(err.message); }
  };

  const handleInvoice = async (e) => {
    e.preventDefault();
    if (!invoiceDate || !dueDate || dueDate < invoiceDate) return alert('Due date must be on or after the invoice date.');
    try { await generateInvoiceFromSO(invoiceModal.id, { invoiceDate, dueDate }); setInvoiceModal(null); } catch (err) { alert(err.message); }
  };

  return (
    <div>
      <PageHeader title="Sales Orders" description="Select a customer and products to raise a sales order.">
        <Button onClick={openNew}>
          <Plus size={16} className="mr-1 inline" /> New sales order
        </Button>
      </PageHeader>

      {salesOrders.length === 0 ? (
        <EmptyState label="No sales orders yet." />
      ) : (
        <table className="ledger-table">
          <thead>
            <tr>
              <th>SO</th>
              <th>Customer</th>
              <th>Date</th>
              <th className="text-right">Amount</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {[...salesOrders].reverse().map((so) => {
              const customer = contacts.find((c) => c.id === so.customerId);
              const total = Number(so.total || 0);
              return (
                <tr key={so.id}>
                  <td className="font-num text-inksoft">{so.id}</td>
                  <td className="text-ink">{customer?.name}</td>
                  <td className="text-inksoft">{formatDate(so.date)}</td>
                  <td className="text-right font-num">{formatCurrency(total)}</td>
                  <td>
                    <Badge tone={STATUS_TONE[so.status]}>{so.status}</Badge>
                  </td>
                  <td className="text-right">
                    {so.status === 'Draft' && (
                      <Button variant="ghost" onClick={async () => {
                        try { await confirmSalesOrder(so.id); } catch (e) { alert(e.message); }
                      }}>Confirm</Button>
                    )}
                    {so.status === 'Confirmed' && (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setInvoiceModal(so);
                          setInvoiceDate('');
                          setDueDate('');
                        }}
                      >
                        Generate invoice
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New sales order" width="max-w-2xl">
        <form onSubmit={handleCreate}>
          <Field label="Customer">
            <Select required value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Products">
            <LineItemsEditor lines={lines} onChange={setLines} products={activeProducts} priceField="salesPrice" />
          </Field>
          <Field label="Tax rate (%)">
            <Input type="number" min="0" max="100" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
          </Field>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!customerId || lines.length === 0}>
              Create sales order
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!invoiceModal} onClose={() => setInvoiceModal(null)} title={`Generate invoice from ${invoiceModal?.id}`}>
        <form onSubmit={handleInvoice}>
          <p className="mb-4 text-sm text-inksoft">This posts a Debtors / Sales Income journal entry for the order total plus tax.</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Invoice date">
              <Input type="date" required value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </Field>
            <Field label="Due date">
              <Input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </Field>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setInvoiceModal(null)}>
              Cancel
            </Button>
            <Button type="submit">Generate invoice</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
