import { ArrowLeft, CalendarDays, Mail, Phone, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Currency, PaymentStatus, Sale, WholesalerDetail, getOne } from '../api/resources';
import { Badge, Button, CurrencyBadge, EmptyRow, StatCard } from '../shared/ui';

const currencies: Currency[] = ['ARS', 'USD', 'CHL'];
const statusLabel: Record<PaymentStatus, string> = { paid: 'Pagada', partial: 'Parcial', pending: 'Pendiente' };
const statusTone: Record<PaymentStatus, 'green' | 'amber' | 'red'> = { paid: 'green', partial: 'amber', pending: 'red' };

function money(value: string | number, currency: Currency) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value));
}

function date(value: string) {
  return new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}

function productNames(sale: Sale) {
  return sale.items?.map((item) => item.product?.name ?? item.externalProductName ?? 'Producto sin nombre').join(', ') || '-';
}

export function MayoristaDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<WholesalerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [month, setMonth] = useState('');

  async function load() {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      setDetail(await getOne<WholesalerDetail>(`/wholesalers/${id}/detail`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el detalle');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [id]);

  const sales = useMemo(() => detail?.sales.filter((sale) => !month || sale.saleDate.startsWith(month)) ?? [], [detail, month]);
  const payments = useMemo(() => detail?.payments.filter((payment) => !month || payment.paymentDate.startsWith(month)) ?? [], [detail, month]);
  const filteredTotals = useMemo(() => sales.reduce<Partial<Record<Currency, { sold: number; paid: number; balance: number }>>>((result, sale) => {
    result[sale.currency] ??= { sold: 0, paid: 0, balance: 0 };
    result[sale.currency]!.sold += Number(sale.totalAmount);
    result[sale.currency]!.paid += Number(sale.paidAmount);
    result[sale.currency]!.balance += Number(sale.balanceAmount);
    return result;
  }, {}), [sales]);

  if (loading) return <div className="detail-state">Cargando detalle del mayorista...</div>;
  if (error || !detail) return <div className="detail-state error">{error || 'Mayorista no encontrado'} <Button variant="outline" onClick={() => void load()}><RefreshCw size={14} /> Reintentar</Button></div>;

  const totalUnits = sales.reduce((sum, sale) => sum + (sale.items?.reduce((itemSum, item) => itemSum + item.quantity, 0) ?? 0), 0);

  return (
    <div className="page-stack">
      <div className="detail-header">
        <Button variant="outline" className="icon-btn" aria-label="Volver" onClick={() => navigate('/mayoristas')}><ArrowLeft size={16} /></Button>
        <div><h1>{detail.wholesaler.name}</h1><div className="detail-contact">{detail.wholesaler.phone && <span><Phone size={13} />{detail.wholesaler.phone}</span>}{detail.wholesaler.email && <span><Mail size={13} />{detail.wholesaler.email}</span>}</div></div>
        <div className="toolbar-spacer" />
        <label><span className="form-label">Período</span><input className="form-input" type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>
        {month && <Button variant="outline" onClick={() => setMonth('')}>Ver todo</Button>}
        <Button variant="outline" onClick={() => void load()}><RefreshCw size={14} /> Actualizar</Button>
      </div>

      <div className="wholesaler-summary">
        <StatCard label="Equipos vendidos" value={String(totalUnits)} />
        {currencies.map((currency) => <StatCard key={currency} label={`Saldo ${currency}`} value={money(filteredTotals[currency]?.balance ?? 0, currency)} tone={(filteredTotals[currency]?.balance ?? 0) > 0 ? 'amber' : 'green'} />)}
      </div>

      <div className="table-card detail-table">
        <div className="table-head"><span><CalendarDays size={14} /> Ventas {month ? 'del período' : 'históricas'}</span><span>{sales.length} operaciones</span></div>
        <table>
          <thead><tr><th>Fecha</th><th>Equipo</th><th>Cant.</th><th>Total</th><th>Pagado</th><th>Moneda</th><th>Saldo</th><th>Estado</th></tr></thead>
          <tbody>
            {sales.length === 0 && <EmptyRow colSpan={8} label="Sin ventas para el período seleccionado" />}
            {sales.map((sale) => <tr key={sale.id}>
              <td>{date(sale.saleDate)}</td><td className="primary product-cell">{productNames(sale)}</td><td>{sale.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0}</td>
              <td>{money(sale.totalAmount, sale.currency)}</td><td>{money(sale.paidAmount, sale.currency)}</td><td><CurrencyBadge>{sale.currency}</CurrencyBadge></td><td className={Number(sale.balanceAmount) > 0 ? 'balance-due' : ''}>{money(sale.balanceAmount, sale.currency)}</td><td><Badge tone={statusTone[sale.status]}>{statusLabel[sale.status]}</Badge></td>
            </tr>)}
          </tbody>
          {sales.length > 0 && <tfoot><tr><td colSpan={2}>Totales por moneda</td><td>{totalUnits}</td><td colSpan={5}>{currencies.filter((currency) => filteredTotals[currency]).map((currency) => <span className="total-chip" key={currency}>{currency}: {money(filteredTotals[currency]!.sold, currency)} · Pagado {money(filteredTotals[currency]!.paid, currency)} · Saldo {money(filteredTotals[currency]!.balance, currency)}</span>)}</td></tr></tfoot>}
        </table>
      </div>

      <div className="table-card detail-table">
        <div className="table-head"><span>Historial de pagos</span><span>{payments.length} pagos</span></div>
        <table><thead><tr><th>Fecha</th><th>Venta</th><th>Monto</th><th>Moneda</th><th>Método</th><th>Observaciones</th></tr></thead><tbody>
          {payments.length === 0 && <EmptyRow colSpan={6} label="Sin pagos para el período seleccionado" />}
          {payments.map((payment) => <tr key={payment.id}><td>{date(payment.paymentDate)}</td><td>{payment.sale ? `#${payment.sale.id.slice(0, 8)}` : '-'}</td><td className="primary">{money(payment.amount, payment.currency)}</td><td><CurrencyBadge>{payment.currency}</CurrencyBadge></td><td>{payment.method}</td><td>{payment.observations || '-'}</td></tr>)}
        </tbody></table>
      </div>
    </div>
  );
}
