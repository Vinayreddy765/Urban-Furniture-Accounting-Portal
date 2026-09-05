import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';
import LineItemsEditor from '../components/LineItemsEditor.jsx';
import { Field, Select, Input, Button, Badge } from '../components/Field.jsx';
import { formatCurrency, formatDate } from '../utils/format.js';

const STATUS_TONE = { Draft: 'neutral', Confirmed: 'brass' };

export default function PurchaseOrders() {
  const { purchaseOrders, contacts, products, createPurchaseOrder, convertPOToBill, confirmPurchaseOrder } = useData();
  const [open, setOpen] = useState(false);
  const [billModal, setBillModal] = useState(null);
  const [vendorId, setVendorId] = useState('');
  const [lines, setLines] = useState([]);
  const [billDate, setBillDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  const vendors = contacts.filter((c) => c.type === 'Vendor' && !c.archived);
  const activeProducts = products.filter((p) => !p.archived);

  const openNew = () => {
    setVendorId('');
    setLines([]);
    setOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!lines.length || lines.some(l => !l.productId || Number(l.quantity) <= 0 || Number(l.unitPrice) < 0)) return alert('Add at least one valid product line with quantity greater than 0.');
    try { await createPurchaseOrder({ vendorId, lines }); setOpen(false); } catch (err) { alert(err.message); }
  };

  const handleConvert = async (e) => {
    e.preventDefault();
    if (!billDate || !dueDate || dueDate < billDate) return alert('Due date must be on or after the invoice date.');
    try { await convertPOToBill(billModal.id, { invoiceDate: billDate, dueDate }); setBillModal(null); } catch (err) { alert(err.message); }
  };

  return (
    <div>
      <PageHeader title="Purchase Orders" description="Select a vendor and products to raise a purchase order.">
        <Button onClick={openNew}>
          <Plus size={16} className="mr-1 inline" /> New purchase order
        </Button>
      </PageHeader>

      {purchaseOrders.length === 0 ? (
        <EmptyState label="No purchase orders yet." />
      ) : (
        <table className="ledger-table">
          <thead>
            <tr>
              <th>PO</th>
              <th>Vendor</th>
              <th>Date</th>
              <th className="text-right">Amount</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {[...purchaseOrders].reverse().map((po) => {
              const vendor = contacts.find((c) => c.id === po.vendorId);
              const total = Number(po.total || 0);
              return (
                <tr key={po.id}>
                  <td className="font-num text-inksoft">{po.id}</td>
                  <td className="text-ink">{vendor?.name}</td>
                  <td className="text-inksoft">{formatDate(po.date)}</td>
                  <td className="text-right font-num">{formatCurrency(total)}</td>
                  <td>
                    <Badge tone={STATUS_TONE[po.status]}>{po.status}</Badge>
                  </td>
                  <td className="text-right">
                    {po.status === 'Draft' && (
                      <Button variant="ghost" onClick={async () => {
                        try { await confirmPurchaseOrder(po.id); } catch (e) { alert(e.message); }
                      }}>Confirm</Button>
                    )}
                    {po.status === 'Confirmed' && (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setBillModal(po);
                          setBillDate('');
                          setDueDate('');
                        }}
                      >
                        Convert to bill
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New purchase order" width="max-w-2xl">
        <form onSubmit={handleCreate}>
          <Field label="Vendor">
            <Select required value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
              <option value="">Select vendor</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Products">
            <LineItemsEditor lines={lines} onChange={setLines} products={activeProducts} priceField="cost" />
          </Field>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!vendorId || lines.length === 0}>
              Create purchase order
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!billModal} onClose={() => setBillModal(null)} title={`Convert ${billModal?.id} to vendor bill`}>
        <form onSubmit={handleConvert}>
          <p className="mb-4 text-sm text-inksoft">
            This records the goods as received and posts a Purchases Expense / Creditors journal entry.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Invoice date">
              <Input type="date" required value={billDate} onChange={(e) => setBillDate(e.target.value)} />
            </Field>
            <Field label="Due date">
              <Input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </Field>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setBillModal(null)}>
              Cancel
            </Button>
            <Button type="submit">Generate vendor bill</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
