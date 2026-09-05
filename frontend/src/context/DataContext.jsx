import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../utils/api.js';
import { useAuth } from './AuthContext.jsx';

const DataContext = createContext(null);
const today = () => new Date().toISOString().slice(0, 10);
const n = (v) => Number(v || 0);

const mapContact = (c) => ({ ...c, id: c.id, type: c.type, archived: !!c.is_archived, mobile: c.mobile || '', email: c.email || '' });
const mapProduct = (p) => ({ ...p, salesPrice: n(p.sales_price ?? p.salesPrice), cost: n(p.cost_price ?? p.cost), stockQuantity: n(p.stock_quantity ?? p.stockQuantity), archived: !!p.is_archived });
const mapLine = (l) => ({ ...l, productId: l.product_id ?? l.productId, quantity: n(l.quantity), unitPrice: n(l.unit_price ?? l.unitPrice), taxPercent: n(l.tax_percent ?? l.taxPercent), analyticAccountId: l.analytic_account_id ?? l.analyticAccountId });
const mapSO = (x) => ({ ...x, id: x.id, customerId: x.customer_id ?? x.customerId, date: x.order_date ?? x.date, status: x.status, total: n(x.total), lines: (x.lines || x.items || []).map(mapLine) });
const mapPO = (x) => ({ ...x, id: x.id, vendorId: x.vendor_id ?? x.vendorId, date: x.order_date ?? x.date, status: x.status, total: n(x.total), lines: (x.lines || x.items || []).map(mapLine) });
const mapBill = (x) => ({ ...x, id: x.id, poId: x.po_id, vendorId: x.vendor_id, invoiceDate: x.invoice_date, dueDate: x.due_date, status: x.status, total: n(x.total), amountPaid: n(x.amount_paid), lines: (x.lines || []).map(mapLine) });
const mapInvoice = (x) => ({ ...x, id: x.id, soId: x.so_id, customerId: x.customer_id, invoiceDate: x.invoice_date, dueDate: x.due_date, status: x.status, subtotal: n(x.subtotal), tax: n(x.tax_total ?? x.tax), total: n(x.total), amountPaid: n(x.amount_paid), lines: (x.lines || []).map(mapLine) });
const mapPayment = (x) => ({ ...x, id: x.id, type: x.payment_type === 'Pay' ? 'Bill' : 'Invoice', paymentType: x.payment_type, amount: n(x.amount), date: x.payment_date, method: x.method, targetId: x.linked_bill_id ?? x.linked_invoice_id });
const mapJournal = (x) => ({ ...x, defaultDebitAccountId: x.default_debit_account_id ?? x.defaultDebitAccountId, defaultCreditAccountId: x.default_credit_account_id ?? x.defaultCreditAccountId, cashOrBankAccountId: x.cash_or_bank_account_id ?? x.cashOrBankAccountId, archived: !!x.is_archived });
const mapAnalytic = (x) => ({ ...x, id: x.id, name: x.name, type: x.type, archived: !!x.is_archived });
const mapBudget = (x) => ({ ...x, id: x.id, name: x.name, periodStart: x.period_start ?? x.periodStart, periodEnd: x.period_end ?? x.periodEnd, responsiblePerson: x.responsible_person ?? x.responsiblePerson, analyticAccountId: x.analytic_account_id ?? x.analyticAccountId, plannedAmount: n(x.planned_amount ?? x.plannedAmount) });

export function DataProvider({ children }) {
  const { user } = useAuth();
  const [data, setData] = useState({ contacts: [], products: [], accounts: [], journals: [], analyticAccounts: [], budgets: [], purchaseOrders: [], vendorBills: [], salesOrders: [], customerInvoices: [], payments: [], journalEntries: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user) { setData({ contacts: [], products: [], accounts: [], journals: [], analyticAccounts: [], budgets: [], purchaseOrders: [], vendorBills: [], salesOrders: [], customerInvoices: [], payments: [], journalEntries: [] }); return; }
    setLoading(true); setError('');
    try {
      if (user.role === 'User') {
        const [contact, invoices, bills, payments] = await Promise.all([
          api.get('/contacts/mine'), api.get('/portal/invoices'), api.get('/portal/bills'), api.get('/payments/mine')
        ]);
        setData(d => ({ ...d, contacts: [mapContact(contact)], customerInvoices: (invoices || []).map(mapInvoice), vendorBills: (bills || []).map(mapBill), payments: (payments || []).map(mapPayment) }));
      } else {
        const [contacts, products, accounts, journals, analyticAccounts, budgets, purchaseOrders, vendorBills, salesOrders, customerInvoices, payments, journalEntrySummaries] = await Promise.all([
          api.get('/contacts?includeArchived=true'), api.get('/products?includeArchived=true'), api.get('/accounts?includeArchived=true'), api.get('/journals?includeArchived=true'), api.get('/analytic-accounts?includeArchived=true'), api.get('/budgets'), api.get('/purchase-orders'), api.get('/vendor-bills'), api.get('/sales-orders'), api.get('/customer-invoices'), api.get('/payments'), api.get('/journal-entries')
        ]);
        const journalEntries = await Promise.all((journalEntrySummaries || []).map(entry => api.get(`/journal-entries/${entry.id}`)));
        setData({ contacts: contacts.map(mapContact), products: products.map(mapProduct), accounts: accounts.map(a => ({ ...a, archived: !!a.is_archived })), journals: journals.map(mapJournal), analyticAccounts: analyticAccounts.map(mapAnalytic), budgets: budgets.map(mapBudget), purchaseOrders: purchaseOrders.map(mapPO), vendorBills: vendorBills.map(mapBill), salesOrders: salesOrders.map(mapSO), customerInvoices: customerInvoices.map(mapInvoice), payments: payments.map(mapPayment), journalEntries });
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const addContact = useCallback(async (c) => { const created = await api.post('/contacts', { ...c, mobile: c.mobile || null, pincode: c.pincode || null }); await load(); return created.contact || created; }, [load]);
  const updateContact = useCallback(async (id, patch) => { const updated = await api.put(`/contacts/${id}`, patch); await load(); return updated; }, [load]);
  const archiveContact = useCallback(async (id, archived = true) => {
  const updated = await api.patch(`/contacts/${id}/archive`, {
    archived
  });
  await load();
  return updated;
}, [load]);
  const addProduct = useCallback(async (p) => { const created = await api.post('/products', { name: p.name.trim(), type: p.type, salesPrice: n(p.salesPrice), costPrice: n(p.cost), category: p.category?.trim() || null }); await load(); return created; }, [load]);
  const updateProduct = useCallback(async (id, p) => { const updated = await api.put(`/products/${id}`, { name: p.name.trim(), type: p.type, salesPrice: n(p.salesPrice), costPrice: n(p.cost), category: p.category?.trim() || null }); await load(); return updated; }, [load]);
  const archiveProduct = useCallback(async (id, archived = true) => { const updated = await api.patch(`/products/${id}/archive`, { archived }); await load(); return updated; }, [load]);
  const addAccount = useCallback(async (a) => { const r = await api.post('/accounts', a); await load(); return r; }, [load]);
  const updateAccount = useCallback(async (id, p) => { const r = await api.put(`/accounts/${id}`, p); await load(); return r; }, [load]);
  const archiveAccount = useCallback(async (id, archived = true) => { const r = await api.patch(`/accounts/${id}/archive`, { archived }); await load(); return r; }, [load]);
  const addJournal = useCallback(async (j) => { const r = await api.post('/journals', j); await load(); return r; }, [load]);
  const archiveJournal = useCallback(async (id, archived = true) => { const r = await api.patch(`/journals/${id}/archive`, { archived }); await load(); return r; }, [load]);
  const addAnalyticAccount = useCallback(async (a) => { const r = await api.post('/analytic-accounts', a); await load(); return r; }, [load]);
  const archiveAnalyticAccount = useCallback(async (id, archived = true) => { const r = await api.patch(`/analytic-accounts/${id}/archive`, { archived }); await load(); return r; }, [load]);
  const addBudget = useCallback(async (b) => { const r = await api.post('/budgets', { name: b.name, periodStart: b.periodStart, periodEnd: b.periodEnd, responsiblePerson: b.responsiblePerson, analyticAccountId: Number(b.analyticAccountId), plannedAmount: n(b.plannedAmount) }); await load(); return r; }, [load]);

  const createPurchaseOrder = useCallback(async (po) => {
    const payload = { vendorId: Number(po.vendorId), orderDate: po.date || today(), lines: po.lines.map(l => ({ productId: Number(l.productId), quantity: n(l.quantity), unitPrice: n(l.unitPrice), analyticAccountId: l.analyticAccountId ? Number(l.analyticAccountId) : undefined })) };
    const r = await api.post('/purchase-orders', payload); await load(); return r;
  }, [load]);
  const convertPOToBill = useCallback(async (poId, d) => { const r = await api.post('/vendor-bills/from-po', { poId: Number(poId), invoiceDate: d.invoiceDate || today(), dueDate: d.dueDate || null }); await load(); return r; }, [load]);
  const confirmPurchaseOrder = useCallback(async (id) => { const r = await api.patch(`/purchase-orders/${id}/confirm`); await load(); return r; }, [load]);

  const createSalesOrder = useCallback(async (so) => {
    const payload = { customerId: Number(so.customerId), orderDate: so.date || today(), lines: so.lines.map(l => ({ productId: Number(l.productId), quantity: n(l.quantity), unitPrice: n(l.unitPrice), taxPercent: n(l.taxPercent ?? so.taxRate ?? 0), analyticAccountId: l.analyticAccountId ? Number(l.analyticAccountId) : undefined })) };
    const r = await api.post('/sales-orders', payload); await load(); return r;
  }, [load]);
  const generateInvoiceFromSO = useCallback(async (soId, d) => { const r = await api.post('/customer-invoices/from-so', { soId: Number(soId), invoiceDate: d.invoiceDate || today(), dueDate: d.dueDate || null }); await load(); return r; }, [load]);
  const confirmSalesOrder = useCallback(async (id) => { const r = await api.patch(`/sales-orders/${id}/confirm`); await load(); return r; }, [load]);

  const recordPayment = useCallback(async (payment) => {
    const paymentType = payment.type === 'Bill' ? 'Pay' : (payment.paymentType || 'Receive');
    const targetId = Number(payment.targetId);
    const target = paymentType === 'Pay' ? data.vendorBills.find(b => Number(b.id) === targetId) : data.customerInvoices.find(i => Number(i.id) === targetId);
    const contactId = payment.contactId || target?.vendorId || target?.customerId || user?.contactId;
    if (!contactId) throw new Error('Unable to determine the payment contact.');
    const outstanding = n(target?.total) - n(target?.amountPaid);
    if (!Number.isFinite(n(payment.amount)) || n(payment.amount) <= 0) throw new Error('Payment amount must be greater than 0.');
    if (target && n(payment.amount) > outstanding + 0.005) throw new Error(`Payment cannot exceed the outstanding balance of ₹${outstanding.toFixed(2)}.`);
    const payload = { contactId: Number(contactId), paymentType, amount: n(payment.amount), paymentDate: payment.date || today(), method: payment.method || 'Bank' };
    if (paymentType === 'Pay') payload.linkedBillId = targetId;
    else payload.linkedInvoiceId = targetId;
    const r = await api.post(user?.role === 'User' ? '/payments/mine' : '/payments', payload); await load(); return r;
  }, [load, user, data.vendorBills, data.customerInvoices]);

  const accountBalance = useCallback((accountId) => {
    const account = data.accounts.find(a => Number(a.id) === Number(accountId)); if (!account) return 0;
    return data.journalEntries.reduce((total, je) => {
      const items = je.lines || je.items || [];
      return total + items.reduce((s, l) => Number(l.account_id ?? l.accountId) === Number(accountId) ? s + ((account.type === 'Asset' || account.type === 'Expense') ? n(l.debit) - n(l.credit) : n(l.credit) - n(l.debit)) : s, 0);
    }, 0);
  }, [data.accounts, data.journalEntries]);

  const budgetActual = useCallback(async (budget) => {
    try { const r = await api.get(`/reports/budget?from=${budget.periodStart || today()}&to=${budget.periodEnd || today()}`); const x = (r.budgets || []).find(b => Number(b.id) === Number(budget.id)); return { planned: n(budget.plannedAmount ?? budget.planned_amount), actual: n(x?.actual_amount), variance: n(x?.variance) }; } catch { return { planned: n(budget.plannedAmount), actual: 0, variance: n(budget.plannedAmount) }; }
  }, []);

  const getReport = useCallback((path, from, to) => api.get(`${path}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`), []);
  const getStockReport = useCallback(() => api.get('/reports/stock'), []);

  const value = useMemo(() => ({ ...data, loading, error, refresh: load, addContact, updateContact, archiveContact, addProduct, updateProduct, archiveProduct, addAccount, updateAccount, archiveAccount, addJournal, archiveJournal, addAnalyticAccount, archiveAnalyticAccount, addBudget, createPurchaseOrder, convertPOToBill, confirmPurchaseOrder, createSalesOrder, generateInvoiceFromSO, confirmSalesOrder, recordPayment, accountBalance, budgetActual, getReport, getStockReport }), [data, loading, error, load, addContact, updateContact, archiveContact, addProduct, updateProduct, archiveProduct, addAccount, updateAccount, archiveAccount, addJournal, archiveJournal, addAnalyticAccount, archiveAnalyticAccount, addBudget, createPurchaseOrder, convertPOToBill, confirmPurchaseOrder, createSalesOrder, generateInvoiceFromSO, confirmSalesOrder, recordPayment, accountBalance, budgetActual, getReport, getStockReport]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
export const useData = () => useContext(DataContext);
