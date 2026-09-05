import React, { useState } from 'react';
import { useData } from '../context/DataContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';
import { Field, Select, Input, Button, Badge } from '../components/Field.jsx';
import { formatCurrency, formatDate } from '../utils/format.js';

export default function VendorBills() {
  const { vendorBills, contacts, recordPayment } = useData();
  const [payModal, setPayModal] = useState(null);
  const [method, setMethod] = useState('Bank');
  const [amount, setAmount] = useState('');

  const openPay = (bill) => {
    setPayModal(bill);
    setMethod('Bank');
    setAmount(bill.total);
  };

  const handlePay = async (e) => {
    e.preventDefault();
    const value = Number(amount);
    const remaining = Number(payModal.total) - Number(payModal.amountPaid || 0);
    if (!Number.isFinite(value) || value <= 0 || value > remaining + 0.005) return alert(`Enter an amount between ₹0.01 and the outstanding ₹${remaining.toFixed(2)}.`);
    try { await recordPayment({ type: 'Bill', targetId: payModal.id, amount: value, method }); setPayModal(null); } catch (err) { alert(err.message); }
  };

  return (
    <div>
      <PageHeader title="Vendor Bills" description="Bills converted from purchase orders, awaiting or marked as paid." />

      {vendorBills.length === 0 ? (
        <EmptyState label="No vendor bills yet — convert a purchase order first." />
      ) : (
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Bill</th>
              <th>Vendor</th>
              <th>Invoice date</th>
              <th>Due date</th>
              <th className="text-right">Amount</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {[...vendorBills].reverse().map((b) => {
              const vendor = contacts.find((c) => c.id === b.vendorId);
              return (
                <tr key={b.id}>
                  <td className="font-num text-inksoft">{b.id}</td>
                  <td className="text-ink">{vendor?.name}</td>
                  <td className="text-inksoft">{formatDate(b.invoiceDate)}</td>
                  <td className="text-inksoft">{formatDate(b.dueDate)}</td>
                  <td className="text-right font-num">{formatCurrency(b.total)}</td>
                  <td>
                    <Badge tone={b.status === 'Paid' ? 'good' : 'bad'}>{b.status}</Badge>
                  </td>
                  <td className="text-right">
                    {['Posted', 'PartiallyPaid'].includes(b.status) && (
                      <Button variant="ghost" onClick={() => openPay(b)}>
                        Register payment
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <Modal open={!!payModal} onClose={() => setPayModal(null)} title={`Pay bill ${payModal?.id}`}>
        <form onSubmit={handlePay}>
          <Field label="Amount (₹)">
            <Input type="number" min="0.01" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Pay via">
            <Select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option>Bank</option>
              <option>Cash</option>
            </Select>
          </Field>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setPayModal(null)}>
              Cancel
            </Button>
            <Button type="submit">Confirm payment</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
