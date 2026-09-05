import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  BookOpen,
  Layers,
  Target,
  Wallet,
  ShoppingCart,
  Receipt,
  ClipboardList,
  FileText,
  CreditCard,
  Scale,
  TrendingUp,
  PieChart,
  FileKey,
  UserCog,
  LogOut,
} from 'lucide-react';
import { useAuth, ROLES } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';

const NAV = [
  {
    group: 'Overview',
    roles: [ROLES.ADMIN, ROLES.INVOICING_USER, ROLES.CONTACT],
    items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    group: 'Master Data',
    roles: [ROLES.ADMIN, ROLES.INVOICING_USER],
    items: [
      { to: '/contacts', label: 'Contacts', icon: Users },
      { to: '/products', label: 'Products', icon: Package },
      { to: '/accounts', label: 'Chart of Accounts', icon: BookOpen },
      { to: '/journals', label: 'Journals', icon: Layers },
      { to: '/analytic-accounts', label: 'Analytic Accounts', icon: Target },
      { to: '/budgets', label: 'Budgets', icon: Wallet },
    ],
  },
  {
    group: 'Administration',
    roles: [ROLES.ADMIN],
    items: [{ to: '/users', label: 'Users', icon: UserCog }],
  },
  {
    group: 'Purchases',
    roles: [ROLES.ADMIN, ROLES.INVOICING_USER],
    items: [
      { to: '/purchase-orders', label: 'Purchase Orders', icon: ShoppingCart },
      { to: '/vendor-bills', label: 'Vendor Bills', icon: Receipt },
    ],
  },
  {
    group: 'Sales',
    roles: [ROLES.ADMIN, ROLES.INVOICING_USER],
    items: [
      { to: '/sales-orders', label: 'Sales Orders', icon: ClipboardList },
      { to: '/customer-invoices', label: 'Customer Invoices', icon: FileText },
    ],
  },
  {
    group: 'My Account',
    roles: [ROLES.CONTACT],
    items: [{ to: '/my-invoices', label: 'My Invoices & Bills', icon: FileText }],
  },
  {
    group: 'Payments',
    roles: [ROLES.ADMIN, ROLES.INVOICING_USER],
    items: [{ to: '/payments', label: 'Payments', icon: CreditCard }],
  },
  {
    group: 'Reports',
    roles: [ROLES.ADMIN, ROLES.INVOICING_USER],
    items: [
      { to: '/reports/balance-sheet', label: 'Balance Sheet', icon: Scale },
      { to: '/reports/profit-loss', label: 'Profit & Loss', icon: TrendingUp },
      { to: '/reports/budget', label: 'Budget Report', icon: PieChart },
      { to: '/reports/stock', label: 'Stock Report', icon: Package },
      { to: '/reports/trial-balance', label: 'Trial Balance', icon: Scale },
    ],
  },
  {
    group: 'Ledger',
    roles: [ROLES.ADMIN, ROLES.INVOICING_USER],
    items: [{ to: '/journal-entries', label: 'Journal Entries', icon: FileKey }],
  },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { loading, error } = useData();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visibleGroups = NAV.filter((g) => g.roles.includes(user?.role));

  return (
    <div className="flex min-h-screen bg-paper">
      <aside className="flex w-64 shrink-0 flex-col border-r border-line bg-surface">
        <div className="border-b border-line px-5 py-5">
          <p className="font-display text-xl leading-tight text-ink">Urban Furniture</p>
          <p className="text-xs tracking-wide text-inksoft">Accounting Ledger</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {visibleGroups.map((group) => (
            <div key={group.group} className="mb-5 px-3">
              <p className="mb-1.5 px-2 text-[0.7rem] font-medium text-inksoft">{group.group}</p>
              <ul className="space-y-0.5">
                {group.items.map(({ to, label, icon: Icon, end }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={end}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 border-l-2 px-2.5 py-1.5 text-sm transition-colors ${
                          isActive
                            ? 'border-brass bg-brass-light/40 font-medium text-walnut-dark'
                            : 'border-transparent text-inksoft hover:border-line hover:bg-paper hover:text-ink'
                        }`
                      }
                    >
                      <Icon size={16} strokeWidth={1.75} />
                      {label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-line px-5 py-4">
          <p className="text-sm font-medium text-ink">{user?.name}</p>
          <p className="mb-3 text-xs text-inksoft">{user?.role}</p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs font-medium text-inksoft hover:text-brick"
          >
            <LogOut size={14} /> Switch user
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden px-8 py-8">
        <div className="mx-auto max-w-6xl">
          {loading && <p className="mb-4 text-sm text-inksoft">Loading ledger data...</p>}
          {error && <p className="mb-4 border border-brick bg-brick-light px-3 py-2 text-sm text-brick">{error}</p>}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
