import React from 'react';
import { useData } from '../context/DataContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { Badge } from '../components/Field.jsx';
import { formatCurrency, formatDate } from '../utils/format.js';

export default function Payments() {
  const { payments, contacts, vendorBills, customerInvoices } = useData();

  const contactFor = (payment) => {
    if (payment.type === 'Bill') {
      const bill = vendorBills.find((b) => b.id === payment.targetId);
      return contacts.find((c) => c.id === bill?.vendorId)?.name;
    }
    const inv = customerInvoices.find((i) => i.id === payment.targetId);
    return contacts.find((c) => c.id === inv?.customerId)?.name;
  };

  return (
    <div>
      <PageHeader title="Payments" description="Every payment made or received, and how it was posted to Cash or Bank." />

      {payments.length === 0 ? (
        <EmptyState label="No payments recorded yet." />
      ) : (
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Contact</th>
              <th>Against</th>
              <th>Method</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {[...payments].reverse().map((p) => (
              <tr key={p.id}>
                <td className="text-inksoft">{formatDate(p.date)}</td>
                <td>
                  <Badge tone={p.type === 'Bill' ? 'bad' : 'good'}>{p.type === 'Bill' ? 'Paid out' : 'Received'}</Badge>
                </td>
                <td className="text-ink">{contactFor(p)}</td>
                <td className="font-num text-inksoft">{p.targetId}</td>
                <td className="text-inksoft">{p.method}</td>
                <td className="text-right font-num">{formatCurrency(p.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
