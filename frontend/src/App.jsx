import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Users from './pages/Users.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Contacts from './pages/Contacts.jsx';
import Products from './pages/Products.jsx';
import ChartOfAccounts from './pages/ChartOfAccounts.jsx';
import Journals from './pages/Journals.jsx';
import AnalyticAccounts from './pages/AnalyticAccounts.jsx';
import Budgets from './pages/Budgets.jsx';
import PurchaseOrders from './pages/PurchaseOrders.jsx';
import VendorBills from './pages/VendorBills.jsx';
import SalesOrders from './pages/SalesOrders.jsx';
import CustomerInvoices from './pages/CustomerInvoices.jsx';
import Payments from './pages/Payments.jsx';
import JournalEntries from './pages/JournalEntries.jsx';
import MyInvoices from './pages/MyInvoices.jsx';
import BalanceSheet from './pages/reports/BalanceSheet.jsx';
import ProfitLoss from './pages/reports/ProfitLoss.jsx';
import BudgetReport from './pages/reports/BudgetReport.jsx';
import StockReport from './pages/reports/StockReport.jsx';
import TrialBalance from './pages/reports/TrialBalance.jsx';

function RequireAuth({ children, roles }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    
      <Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />

  <Route
    element={
      <RequireAuth>
        <Layout />
      </RequireAuth>
    }
  >
    {/* All authenticated users */}
    <Route path="/" element={<Dashboard />} />

    {/* Administrator + Accountant only */}
    <Route
      path="/contacts"
      element={
        <RequireAuth roles={["Administrator", "Accountant"]}>
          <Contacts />
        </RequireAuth>
      }
    />

    <Route path="/users" element={<RequireAuth roles={["Administrator"]}><Users /></RequireAuth>} />

    <Route
      path="/products"
      element={
        <RequireAuth roles={["Administrator", "Accountant"]}>
          <Products />
        </RequireAuth>
      }
    />

    <Route
      path="/accounts"
      element={
        <RequireAuth roles={["Administrator", "Accountant"]}>
          <ChartOfAccounts />
        </RequireAuth>
      }
    />

    <Route
      path="/journals"
      element={
        <RequireAuth roles={["Administrator", "Accountant"]}>
          <Journals />
        </RequireAuth>
      }
    />

    <Route
      path="/analytic-accounts"
      element={
        <RequireAuth roles={["Administrator", "Accountant"]}>
          <AnalyticAccounts />
        </RequireAuth>
      }
    />

    <Route
      path="/budgets"
      element={
        <RequireAuth roles={["Administrator", "Accountant"]}>
          <Budgets />
        </RequireAuth>
      }
    />

    <Route
      path="/purchase-orders"
      element={
        <RequireAuth roles={["Administrator", "Accountant"]}>
          <PurchaseOrders />
        </RequireAuth>
      }
    />

    <Route
      path="/vendor-bills"
      element={
        <RequireAuth roles={["Administrator", "Accountant"]}>
          <VendorBills />
        </RequireAuth>
      }
    />

    <Route
      path="/sales-orders"
      element={
        <RequireAuth roles={["Administrator", "Accountant"]}>
          <SalesOrders />
        </RequireAuth>
      }
    />

    <Route
      path="/customer-invoices"
      element={
        <RequireAuth roles={["Administrator", "Accountant"]}>
          <CustomerInvoices />
        </RequireAuth>
      }
    />

    <Route
      path="/payments"
      element={
        <RequireAuth roles={["Administrator", "Accountant"]}>
          <Payments />
        </RequireAuth>
      }
    />

    <Route
      path="/journal-entries"
      element={
        <RequireAuth roles={["Administrator", "Accountant"]}>
          <JournalEntries />
        </RequireAuth>
      }
    />

    <Route
      path="/reports/balance-sheet"
      element={
        <RequireAuth roles={["Administrator", "Accountant"]}>
          <BalanceSheet />
        </RequireAuth>
      }
    />

    <Route
      path="/reports/profit-loss"
      element={
        <RequireAuth roles={["Administrator", "Accountant"]}>
          <ProfitLoss />
        </RequireAuth>
      }
    />

    <Route
      path="/reports/budget"
      element={
        <RequireAuth roles={["Administrator", "Accountant"]}>
          <BudgetReport />
        </RequireAuth>
      }
    />

    <Route
      path="/reports/stock"
      element={
        <RequireAuth roles={["Administrator", "Accountant"]}>
          <StockReport />
        </RequireAuth>
      }
    />

    <Route path="/reports/trial-balance" element={<RequireAuth roles={["Administrator", "Accountant"]}><TrialBalance /></RequireAuth>} />

    {/* User / Contact portal */}
    <Route
      path="/my-invoices"
      element={
        <RequireAuth roles={["User"]}>
          <MyInvoices />
        </RequireAuth>
      }
    />
  </Route>

  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
        
    
  );
}
