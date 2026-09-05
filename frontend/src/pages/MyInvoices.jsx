import React, { useState } from 'react';
import { useData } from '../context/DataContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';
import { Field, Select, Input, Button, Badge } from '../components/Field.jsx';
import { formatCurrency, formatDate } from '../utils/format.js';

export default function MyInvoices() {
  const { user } = useAuth();
  const { customerInvoices, vendorBills, recordPayment } = useData();
  const [payModal, setPayModal] = useState(null);
  const [method, setMethod] = useState('Bank');
  const [amount, setAmount] = useState('');

  const myInvoices = customerInvoices.filter((i) => i.customerId === user?.contactId);
  const myBills = vendorBills.filter((b) => b.vendorId === user?.contactId);
  const items = [
    ...myInvoices.map((i) => ({ ...i, kind: 'Invoice' })),
    ...myBills.map((b) => ({ ...b, kind: 'Bill' })),
  ];

  const openPay = (item) => {
    setPayModal(item);
    setMethod('Bank');
    setAmount(item.total);
  };

  const handlePay = (e) => {
    e.preventDefault();
    recordPayment({
      type: payModal.kind === 'Invoice' ? 'Invoice' : 'Bill',
      targetId: payModal.id,
      amount: Number(amount),
      method,
    });
    setPayModal(null);
  };

  return (
    <div>
      <PageHeader title="My Invoices & Bills" description="Documents linked to your contact record. You can view and pay them here." />

      {items.length === 0 ? (
        <EmptyState label="Nothing to show yet." />
      ) : (
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Document</th>
              <th>Type</th>
              <th>Date</th>
              <th className="text-right">Amount</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td className="font-num text-inksoft">{it.id}</td>
                <td className="text-ink">{it.kind}</td>
                <td className="text-inksoft">{formatDate(it.invoiceDate)}</td>
                <td className="text-right font-num">{formatCurrency(it.total)}</td>
                <td>
                  <Badge tone={it.status === 'Paid' ? 'good' : 'bad'}>{it.status}</Badge>
                </td>
                <td className="text-right">
                  {it.status !== 'Paid' && (
                    <Button variant="ghost" onClick={() => openPay(it)}>
                      Pay now
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={!!payModal} onClose={() => setPayModal(null)} title={`Pay ${payModal?.id}`}>
        <form onSubmit={handlePay}>
          <Field label="Amount (₹)">
            <Input type="number" min="0" required value={amount} onChange={(e) => setAmount(e.target.value)} />
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
