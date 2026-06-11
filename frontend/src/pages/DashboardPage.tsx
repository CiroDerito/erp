import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard, DashboardSummary, Sale } from '../api/resources';
import { useApiResource } from '../api/useApiResource';
import { money, paymentStatusLabel, paymentStatusTone, shortDate } from '../shared/format';
import { Badge, CurrencyBadge, EmptyRow, StatCard, TableState } from '../shared/ui';

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryError, setSummaryError] = useState('');
  const { data: sales, loading: salesLoading, error: salesError } = useApiResource<Sale>('/sales?limit=4');
  const overdueWholesalers = summary?.overdueWholesalers ?? [];
  const hasOverdueWholesalers = overdueWholesalers.length > 0;

  useEffect(() => {
    let cancelled = false;
    getDashboard()
      .then((result) => {
        if (!cancelled) setSummary(result);
      })
      .catch((err) => {
        if (!cancelled) setSummaryError(err instanceof Error ? err.message : 'No se pudo cargar dashboard');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page-stack">
      <div className="stats-grid">
        <StatCard label="Total vendido" value={money(summary?.totalSold)}>
          <div className="currency-stack">
            <span>ARS {money(summary?.byCurrency.ARS.sold)}</span>
            <span>CHL {money(summary?.byCurrency.CHL.sold)}</span>
            <span>USD {money(summary?.byCurrency.USD.sold)}</span>
          </div>
        </StatCard>
        <StatCard label="Total comprado" value={money(summary?.totalPurchased)} />
        <StatCard label="Total cobrado" value={money(Number(summary?.totalSold ?? 0) - Number(summary?.pendingBalance ?? 0))} />
        <StatCard label="Saldo pendiente" value={money(summary?.pendingBalance)} tone="amber" />
        <StatCard label="Ganancia total" value={money(summary?.profit)} tone="green" />
        <StatCard label="Cantidad de ventas" value={String(summary?.salesCount ?? 0)} />
      </div>

      <div className={`insight-strip ${summaryError ? 'insight-error' : hasOverdueWholesalers ? 'insight-warning' : 'insight-success'}`}>
        {summaryError || hasOverdueWholesalers ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
        {summaryError
          ? summaryError
          : hasOverdueWholesalers
            ? overdueWholesalers.map((item) => `${item.name} registra ${item.daysWithoutPayment} dias sin pagar`).join(' - ')
            : 'No hay mayoristas con mas de 11 dias sin pagos realizados'}
      </div>

      <div className="table-card">
        <div className="table-head">
          <span>Ultimas ventas</span>
          <Link to="/ventas">Ver todas -&gt;</Link>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Mayorista</th>
              <th>Fecha</th>
              <th>Total</th>
              <th>Pagado</th>
              <th>Moneda</th>
              <th>Saldo</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <TableState loading={salesLoading} error={salesError} colSpan={8} />
            {!salesLoading && !salesError && sales.length === 0 ? <EmptyRow colSpan={8} /> : null}
            {sales.map((sale, index) => (
              <tr key={sale.id}>
                <td>{index + 1}</td>
                <td className="primary">{sale.wholesaler?.name ?? '-'}</td>
                <td>{shortDate(sale.saleDate)}</td>
                <td>{money(sale.totalAmount)}</td>
                <td>{money(sale.paidAmount)}</td>
                <td><CurrencyBadge>{sale.currency}</CurrencyBadge></td>
                <td>{money(sale.balanceAmount)}</td>
                <td><Badge tone={paymentStatusTone(sale.status)}>{paymentStatusLabel(sale.status)}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
