import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext.jsx';
import { useAuth, ROLES } from '../context/AuthContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { formatCurrency } from '../utils/format.js';

function StatCard({ label, value, sub, tone = 'ink' }) {
  const toneClass = { ink: 'text-ink', sage: 'text-sage', brick: 'text-brick' }[tone];
  return (
    <div className="border border-line bg-surface p-5">
      <p className="text-xs font-medium text-inksoft">{label}</p>
      <p className={`mt-2 font-num text-2xl ${toneClass}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-inksoft">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user?.role === ROLES.CONTACT) {
    navigate('/my-invoices');
    return null;
  }

  const {
    contacts,
    products,
    purchaseOrders,
    salesOrders,
    vendorBills,
    customerInvoices,
    accountBalance,
  } = useData();

  const unpaidBills = vendorBills.filter((b) => b.status !== 'Paid');
  const unpaidInvoices = customerInvoices.filter((i) => i.status !== 'Paid');
  const cash = accountBalance('a1');
  const bank = accountBalance('a2');
  const receivable = accountBalance('a3');
  const payable = accountBalance('a4');

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${user?.name.split(' ')[0]}. Here's where the books stand today.`}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Cash + Bank" value={formatCurrency(cash + bank)} sub="Combined liquid funds" />
        <StatCard label="Receivable" value={formatCurrency(receivable)} sub={`${unpaidInvoices.length} unpaid invoice(s)`} tone="sage" />
        <StatCard label="Payable" value={formatCurrency(payable)} sub={`${unpaidBills.length} unpaid bill(s)`} tone="brick" />
        <StatCard label="Contacts on file" value={contacts.filter((c) => !c.archived).length} sub={`${products.filter((p) => !p.archived).length} products in catalog`} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="border border-line bg-surface">
          <div className="border-b border-line px-5 py-3">
            <h3 className="font-display text-lg text-ink">Open sales orders</h3>
          </div>
          <ul className="divide-y divide-line">
            {salesOrders.slice(-5).reverse().map((so) => {
              const c = contacts.find((c) => c.id === so.customerId);
              return (
                <li key={so.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span className="text-ink">{c?.name || 'Unknown'}</span>
                  <span className="text-inksoft">{so.status}</span>
                </li>
              );
            })}
            {salesOrders.length === 0 && (
              <li className="px-5 py-6 text-center text-sm text-inksoft">No sales orders yet.</li>
            )}
          </ul>
        </div>

        <div className="border border-line bg-surface">
          <div className="border-b border-line px-5 py-3">
            <h3 className="font-display text-lg text-ink">Open purchase orders</h3>
          </div>
          <ul className="divide-y divide-line">
            {purchaseOrders.slice(-5).reverse().map((po) => {
              const c = contacts.find((c) => c.id === po.vendorId);
              return (
                <li key={po.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span className="text-ink">{c?.name || 'Unknown'}</span>
                  <span className="text-inksoft">{po.status}</span>
                </li>
              );
            })}
            {purchaseOrders.length === 0 && (
              <li className="px-5 py-6 text-center text-sm text-inksoft">No purchase orders yet.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
