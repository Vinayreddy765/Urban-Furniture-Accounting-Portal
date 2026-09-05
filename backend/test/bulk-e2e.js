require('dotenv').config();

const baseUrl = process.env.API_URL || 'http://localhost:5000';
const count = Number(process.env.BULK_COUNT || 20);
const stamp = Date.now().toString().slice(-8);

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${path} -> ${response.status}: ${body?.error?.message || 'Request failed'}`);
  return body?.data ?? body;
}

const post = (path, data, token) => request(path, { method: 'POST', body: JSON.stringify(data), token });
const patch = (path, data, token) => request(path, { method: 'PATCH', body: JSON.stringify(data), token });

async function main() {
  const login = await post('/api/auth/login', { loginId: process.env.TEST_ADMIN_LOGIN || 'admin01', password: process.env.TEST_ADMIN_PASSWORD || 'Admin@12345' });
  const token = login.token;
  const date = new Date().toISOString().slice(0, 10);
  const dueDate = `${date.slice(0, 8)}${String(Math.min(28, Number(date.slice(8, 10)) + 7)).padStart(2, '0')}`;
  const vendors = [];
  const customers = [];
  const products = [];
  const purchaseOrders = [];
  const salesOrders = [];

  const journals = await request('/api/journals?includeArchived=true', { token });
  for (const journal of journals) {
    if (journal.is_archived) await patch(`/api/journals/${journal.id}/archive`, { archived: false }, token);
  }

  for (let index = 1; index <= count; index += 1) {
    const vendor = await post('/api/contacts', {
      name: `Bulk Vendor ${stamp}-${index}`,
      type: 'Vendor',
      email: `bulk-vendor-${stamp}-${index}@example.test`,
      mobile: `98765${String(10000 + index).slice(-5)}`,
      city: 'Bulk City', state: 'Bulk State', pincode: '560001',
    }, token);
    vendors.push(vendor.contact || vendor);

    const customer = await post('/api/contacts', {
      name: `Bulk Customer ${stamp}-${index}`,
      type: 'Customer',
      email: `bulk-customer-${stamp}-${index}@example.test`,
      mobile: `98766${String(10000 + index).slice(-5)}`,
      city: 'Bulk City', state: 'Bulk State', pincode: '560002',
    }, token);
    customers.push(customer.contact || customer);

    const product = await post('/api/products', {
      name: `Bulk Chair ${stamp}-${index}`,
      type: 'Goods',
      salesPrice: 1180,
      costPrice: 700,
      category: 'Bulk Test',
    }, token);
    products.push(product);
  }

  for (let index = 0; index < count; index += 1) {
    const po = await post('/api/purchase-orders', {
      vendorId: vendors[index].id,
      orderDate: date,
      lines: [{ productId: products[index].id, quantity: 2, unitPrice: 700 }],
    }, token);
    await patch(`/api/purchase-orders/${po.id}/confirm`, {}, token);
    const bill = await post('/api/vendor-bills/from-po', { poId: po.id, invoiceDate: date, dueDate }, token);
    await post('/api/payments', {
      contactId: vendors[index].id,
      paymentType: 'Pay',
      amount: Number(bill.total),
      paymentDate: date,
      method: index % 2 ? 'Bank' : 'Cash',
      linkedBillId: bill.id,
    }, token);
    purchaseOrders.push(po.id);
  }

  for (let index = 0; index < count; index += 1) {
    const so = await post('/api/sales-orders', {
      customerId: customers[index].id,
      orderDate: date,
      lines: [{ productId: products[index].id, quantity: 1, unitPrice: 1180, taxPercent: 18 }],
    }, token);
    await patch(`/api/sales-orders/${so.id}/confirm`, {}, token);
    const invoice = await post('/api/customer-invoices/from-so', { soId: so.id, invoiceDate: date, dueDate }, token);
    await post('/api/payments', {
      contactId: customers[index].id,
      paymentType: 'Receive',
      amount: Number(invoice.total),
      paymentDate: date,
      method: index % 2 ? 'Bank' : 'Cash',
      linkedInvoiceId: invoice.id,
    }, token);
    salesOrders.push(so.id);
  }

  const trialBalance = await request(`/api/reports/trial-balance?from=${date}&to=${date}`, { token });
  const balanced = Math.abs(Number(trialBalance.totalDebit) - Number(trialBalance.totalCredit)) <= 0.005;
  const result = {
    created: {
      vendors: vendors.length,
      customers: customers.length,
      products: products.length,
      purchaseOrders: purchaseOrders.length,
      salesOrders: salesOrders.length,
      vendorBills: count,
      customerInvoices: count,
      payments: count * 2,
      totalRecords: count * 8,
    },
    trialBalance: {
      totalDebit: trialBalance.totalDebit,
      totalCredit: trialBalance.totalCredit,
      balanced,
    },
  };
  console.log(JSON.stringify(result, null, 2));
  if (!balanced) process.exitCode = 1;
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
