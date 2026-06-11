import React from 'react';
import ReactDOM from 'react-dom/client';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AuthProvider } from './modules/auth/AuthProvider';
import { PrivateRoute } from './modules/auth/PrivateRoute';
import { AppLayout } from './shared/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { MayoristasPage } from './pages/MayoristasPage';
import { PagosPage } from './pages/PagosPage';
import { ProveedoresPage } from './pages/ProveedoresPage';
import { StockPage } from './pages/StockPage';
import { VentasPage } from './pages/VentasPage';
import { ComprasPage } from './pages/ComprasPage';
import './styles.css';

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <PrivateRoute>
        <AppLayout />
      </PrivateRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'ventas', element: <VentasPage /> },
      { path: 'compras', element: <ComprasPage /> },
      { path: 'stock', element: <StockPage /> },
      { path: 'mayoristas', element: <MayoristasPage /> },
      { path: 'proveedores', element: <ProveedoresPage /> },
      { path: 'pagos', element: <PagosPage /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>,
);
