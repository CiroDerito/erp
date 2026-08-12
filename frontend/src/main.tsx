import React from 'react';
import ReactDOM from 'react-dom/client';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AuthProvider } from './modules/auth/AuthProvider';
import { PrivateRoute } from './modules/auth/PrivateRoute';
import { AppLayout } from './shared/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { MayoristasPage } from './pages/MayoristasPage';
import { MayoristaDetallePage } from './pages/MayoristaDetallePage';
import { PagosPage } from './pages/PagosPage';
import { ProveedoresPage } from './pages/ProveedoresPage';
import { StockPage } from './pages/StockPage';
import { StockDetallePage } from './pages/StockDetallePage';
import { VentasPage } from './pages/VentasPage';
import { ComprasPage } from './pages/ComprasPage';
import { VentaDetallePage } from './pages/VentaDetallePage';
import { CompraDetallePage } from './pages/CompraDetallePage';
import { CajaPage } from './pages/CajaPage';
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
      { path: 'ventas/:id', element: <VentaDetallePage /> },
      { path: 'compras', element: <ComprasPage /> },
      { path: 'compras/:id', element: <CompraDetallePage /> },
      { path: 'stock', element: <StockPage /> },
      { path: 'stock/detalle', element: <StockDetallePage /> },
      { path: 'mayoristas', element: <MayoristasPage /> },
      { path: 'mayoristas/:id', element: <MayoristaDetallePage /> },
      { path: 'proveedores', element: <ProveedoresPage /> },
      { path: 'pagos', element: <PagosPage /> },
      { path: 'caja', element: <CajaPage /> },
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
