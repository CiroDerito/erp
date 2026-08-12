import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard, DashboardSummary, Payment, Sale, StockItem } from '../api/resources';
import { useApiResource } from '../api/useApiResource';
import { money, paymentStatusLabel, paymentStatusTone, shortDate } from '../shared/format';
import { Badge, CurrencyBadge, EmptyRow, StatCard, TableState } from '../shared/ui';

type DashboardCurrency = 'ARS' | 'USD';
type ActiveCurrencyValues = { cash: string; bank: string; currentAccount: string; stock: string; total: string };

const dashboardCurrencies: Array<{ currency: DashboardCurrency; label: string }> = [
  { currency: 'ARS', label: 'ARS' },
  { currency: 'USD', label: 'USD' },
];

const emptyActiveValues: ActiveCurrencyValues = {
  cash: '0.00',
  bank: '0.00',
  currentAccount: '0.00',
  stock: '0.00',
  total: '0.00',
};

function currentMonthValue() {
  return new Date().toISOString().slice(0, 7);
}

function monthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

function buildYearOptions() {
  const current = new Date();
  return Array.from({ length: 6 }, (_, index) => String(current.getFullYear() - index));
}

export function DashboardPage() {
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryError, setSummaryError] = useState('');
  const { data: allSales } = useApiResource<Sale>('/sales?limit=100');
  const { data: payments } = useApiResource<Payment>('/payments?limit=100');
  const { data: stock } = useApiResource<StockItem>('/stock?limit=100');
  const yearOptions = useMemo(buildYearOptions, []);
  const monthNumber = selectedMonth.slice(5, 7);
  const yearNumber = selectedMonth.slice(0, 4);
  const sales = useMemo(
    () => allSales.filter((sale) => sale.saleDate.startsWith(selectedMonth)).slice(0, 4),
    [allSales, selectedMonth],
  );
  const salesLoading = false;
  const salesError = '';
  const overdueWholesalers = summary?.overdueWholesalers ?? [];
  const hasOverdueWholesalers = overdueWholesalers.length > 0;
  const derivedActiveBreakdown = useMemo(() => {
    const monthEnd = new Date(Number(selectedMonth.slice(0, 4)), Number(selectedMonth.slice(5, 7)), 0).toISOString().slice(0, 10);
    const values = dashboardCurrencies.reduce((acc, { currency }) => {
      acc[currency] = { ...emptyActiveValues };
      return acc;
    }, {} as Record<DashboardCurrency, ActiveCurrencyValues>);

    for (const sale of allSales) {
      if (sale.currency !== 'ARS' && sale.currency !== 'USD') continue;
      if (sale.saleDate > monthEnd) continue;
      values[sale.currency].currentAccount = String(Number(values[sale.currency].currentAccount) + Number(sale.balanceAmount));
    }

    for (const payment of payments) {
      if (!payment.sale || (payment.currency !== 'ARS' && payment.currency !== 'USD')) continue;
      if (!payment.paymentDate.startsWith(selectedMonth)) continue;
      if (payment.method === 'cash') {
        values[payment.currency].cash = String(Number(values[payment.currency].cash) + Number(payment.amount));
      }
      if (payment.method === 'transfer') {
        values[payment.currency].bank = String(Number(values[payment.currency].bank) + Number(payment.amount));
      }
    }

    for (const { currency } of dashboardCurrencies) {
      const monthlyPaid = allSales
        .filter((sale) => sale.currency === currency && sale.saleDate.startsWith(selectedMonth))
        .reduce((sum, sale) => sum + Number(sale.paidAmount), 0);
      const categorized = Number(values[currency].cash) + Number(values[currency].bank);
      const uncategorized = Math.max(monthlyPaid - categorized, 0);
      values[currency].cash = String(Number(values[currency].cash) + uncategorized);
    }

    for (const item of stock) {
      if (item.entryDate > monthEnd || (item.costCurrency !== 'ARS' && item.costCurrency !== 'USD')) continue;
      values[item.costCurrency].stock = String(Number(values[item.costCurrency].stock) + Number(item.costAmount));
    }

    for (const { currency } of dashboardCurrencies) {
      const current = values[currency];
      const categorizedTotal = Number(current.cash) + Number(current.bank) + Number(current.currentAccount) + Number(current.stock);
      current.total = String(categorizedTotal);
    }

    return values;
  }, [allSales, payments, selectedMonth, stock]);
  const getActiveValues = (currency: DashboardCurrency) => summary?.activeBreakdown?.[currency] ?? derivedActiveBreakdown[currency];
  const getCapitalInitialValues = (currency: DashboardCurrency) => summary?.capitalInitial?.[currency] ?? emptyActiveValues;
  const getCurrencyValues = (currency: DashboardCurrency) => summary?.byCurrency?.[currency] ?? { sold: '0.00', purchased: '0.00', pending: '0.00' };
  const collectedByCurrency = (currency: DashboardCurrency) => {
    const values = getActiveValues(currency);
    return Number(values?.cash ?? 0) + Number(values?.bank ?? 0);
  };

  useEffect(() => {
    let cancelled = false;
    getDashboard(selectedMonth)
      .then((result) => {
        if (!cancelled) setSummary(result);
      })
      .catch((err) => {
        if (!cancelled) setSummaryError(err instanceof Error ? err.message : 'No se pudo cargar dashboard');
      });

    return () => {
      cancelled = true;
    };
  }, [selectedMonth]);

  return (
    <div className="page-stack">
      <div className="dashboard-controls">
        <label>
          <span className="form-label">Mes</span>
          <select className="form-input month-select" value={monthNumber} onChange={(event) => setSelectedMonth(`${yearNumber}-${event.target.value}`)}>
            {Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0')).map((month) => (
              <option key={month} value={month}>{monthLabel(`${yearNumber}-${month}`).replace(` de ${yearNumber}`, '')}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="form-label">Año</span>
          <select className="form-input year-select" value={yearNumber} onChange={(event) => setSelectedMonth(`${event.target.value}-${monthNumber}`)}>
            {yearOptions.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="stats-grid">
        <StatCard label="Capital inicial" value="">
          <div className="capital-breakdown">
            <div><span>ARS</span><strong>{money(getCapitalInitialValues('ARS').total)}</strong></div>
            <div><span>USD</span><strong>{money(getCapitalInitialValues('USD').total)}</strong></div>
          </div>
        </StatCard>
        {dashboardCurrencies.map(({ currency, label }) => (
          <StatCard key={`pending-${currency}`} label={`Saldo pendiente ${label}`} value={money(getCurrencyValues(currency).pending)} tone="amber" />
        ))}
        {dashboardCurrencies.map(({ currency, label }) => {
          const values = getCurrencyValues(currency);
          return (
            <StatCard
              key={`profit-${currency}`}
              label={`Ganancia total ${label}`}
              value={money(Number(values.sold) - Number(values.purchased))}
              tone="green"
            />
          );
        })}
        <StatCard label="Cantidad de ventas" value={String(summary?.salesCount ?? sales.length)} />
      </div>

      <div className="stats-grid">
        {dashboardCurrencies.map(({ currency, label }) => {
          const values = getActiveValues(currency);
          return (
            <StatCard key={`active-${currency}`} label={`Total activo ${label}`} value={money(values?.total)} className="stat-card-wide">
              <div className="active-breakdown">
                <div><span>Efectivo</span><strong>{money(values?.cash)}</strong></div>
                <div><span>Banco</span><strong>{money(values?.bank)}</strong></div>
                <div><span>Cuenta corriente</span><strong>{money(values?.currentAccount)}</strong></div>
                <div><span>Stock</span><strong>{money(values?.stock)}</strong></div>
              </div>
            </StatCard>
          );
        })}
        {dashboardCurrencies.map(({ currency, label }) => (
          <StatCard key={`collected-${currency}`} label={`Total cobrado ${label}`} value={money(collectedByCurrency(currency))} />
        ))}
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
