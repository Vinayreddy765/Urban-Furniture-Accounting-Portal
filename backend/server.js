require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { errorHandler, notFound } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
// Next: /api/contacts, /api/products, /api/accounts, /api/journals,
// /api/purchase-orders, /api/vendor-bills, /api/sales-orders,
// /api/customer-invoices, /api/payments, /api/reports

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`UFA API running on port ${PORT}`));
