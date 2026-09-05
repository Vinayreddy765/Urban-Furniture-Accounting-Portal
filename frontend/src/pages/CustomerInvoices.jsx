import React, { useState } from 'react';
import { useData } from '../context/DataContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';
import { Field, Select, Input, Button, Badge } from '../components/Field.jsx';
import { formatCurrency, formatDate } from '../utils/format.js';

export default function CustomerInvoices() {
  const { customerInvoices, contacts, recordPayment } = useData();
  const [payModal, setPayModal] = useState(null);
  const [method, setMethod] = useState('Bank');
  const [amount, setAmount] = useState('');

  const openPay = (invoice) => {
    setPayModal(invoice);
    setMethod('Bank');
    setAmount(invoice.total);
  };

  const handlePay = async (e) => {
    e.preventDefault();
    const value = Number(amount);
    const remaining = Number(payModal.total) - Number(payModal.amountPaid || 0);
    if (!Number.isFinite(value) || value <= 0 || value > remaining + 0.005) return alert(`Enter an amount between ₹0.01 and the outstanding ₹${remaining.toFixed(2)}.`);
    try { await recordPayment({ type: 'Invoice', targetId: payModal.id, amount: value, method }); setPayModal(null); } catch (err) { alert(err.message); }
  };

  return (
    <div>
      <PageHeader title="Customer Invoices" description="Invoices generated from sales orders, awaiting or marked as paid." />

      {customerInvoices.length === 0 ? (
        <EmptyState label="No customer invoices yet — generate one from a sales order." />
      ) : (
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Customer</th>
              <th>Invoice date</th>
              <th>Due date</th>
              <th className="text-right">Total</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {[...customerInvoices].reverse().map((inv) => {
              const customer = contacts.find((c) => c.id === inv.customerId);
              return (
                <tr key={inv.id}>
                  <td className="font-num text-inksoft">{inv.id}</td>
                  <td className="text-ink">{customer?.name}</td>
                  <td className="text-inksoft">{formatDate(inv.invoiceDate)}</td>
                  <td className="text-inksoft">{formatDate(inv.dueDate)}</td>
                  <td className="text-right font-num">{formatCurrency(inv.total)}</td>
                  <td>
                    <Badge tone={inv.status === 'Paid' ? 'good' : 'bad'}>{inv.status}</Badge>
                  </td>
                  <td className="text-right">
                    {inv.status !== 'Paid' && (
                      <Button variant="ghost" onClick={() => openPay(inv)}>
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

      <Modal open={!!payModal} onClose={() => setPayModal(null)} title={`Receive payment for ${payModal?.id}`}>
        <form onSubmit={handlePay}>
          <Field label="Amount (₹)">
            <Input type="number" min="0.01" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Receive via">
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
