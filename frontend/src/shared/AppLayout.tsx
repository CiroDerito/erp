import {
  BarChart3,
  Boxes,
  CreditCard,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  ShoppingBag,
  Store,
  Truck,
  Wallet,
} from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../modules/auth/AuthProvider';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/ventas', label: 'Ventas', icon: ShoppingBag },
  { to: '/compras', label: 'Compras', icon: ReceiptText },
  { to: '/stock', label: 'Stock', icon: Boxes },
  { to: '/mayoristas', label: 'Mayoristas', icon: Store },
  { to: '/proveedores', label: 'Proveedores', icon: Truck },
  { to: '/pagos', label: 'Pagos', icon: CreditCard },
  { to: '/caja', label: 'Caja', icon: Wallet },
];

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/ventas': 'Ventas',
  '/compras': 'Compras',
  '/stock': 'Stock',
  '/mayoristas': 'Mayoristas',
  '/proveedores': 'Proveedores',
  '/pagos': 'Pagos',
  '/caja': 'Control de caja',
};

function getInitials(name?: string) {
  if (!name) return 'AD';

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AD';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const title = titles[location.pathname] ?? 'Sistema de control';
  const initials = getInitials(user?.name);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">
            <BarChart3 size={17} />
          </div>
          <div>
            <div className="logo-text">Sistema de control</div>
            <div className="logo-sub">Sistema de gestion</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Principal</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Icon size={16} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <button className="sidebar-footer" onClick={logout} type="button">
          <div className="avatar">{initials}</div>
          <div className="avatar-info">
            <div className="avatar-name">{user?.name ?? 'Admin'}</div>
            <div className="avatar-role">Administrador</div>
          </div>
          <LogOut size={15} />
        </button>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-title">{title}</div>
          <div className="topbar-spacer" />
          <div className="topbar-date">Junio 2026</div>
          <div className="topbar-avatar">{initials}</div>
        </header>
        <section className="page-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
