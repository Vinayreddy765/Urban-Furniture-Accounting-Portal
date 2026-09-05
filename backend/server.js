require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { errorHandler, notFound } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth.routes');
const contactRoutes = require('./routes/contact.routes');
const productRoutes = require('./routes/product.routes');
const accountRoutes = require('./routes/account.routes');
const journalRoutes = require('./routes/journal.routes');
const purchaseOrderRoutes = require('./routes/purchaseOrder.routes');
const vendorBillRoutes = require('./routes/vendorBill.routes');
const paymentRoutes = require('./routes/payment.routes');
const salesOrderRoutes = require('./routes/salesOrder.routes');
const customerInvoiceRoutes = require('./routes/customerInvoice.routes');
const journalEntryRoutes = require('./routes/journalEntry.routes');
const reportRoutes = require('./routes/report.routes');
const analyticRoutes = require('./routes/analytic.routes');
const budgetRoutes = require('./routes/budget.routes');
const portalRoutes = require('./routes/portal.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/products', productRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/journals', journalRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/vendor-bills', vendorBillRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/sales-orders', salesOrderRoutes);
app.use('/api/customer-invoices', customerInvoiceRoutes);
app.use('/api/journal-entries', journalEntryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/analytic-accounts', analyticRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/portal', portalRoutes);

app.use(notFound);
app.use(errorHandler);

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`UFA API running on port ${PORT}`));
}

module.exports = app;
