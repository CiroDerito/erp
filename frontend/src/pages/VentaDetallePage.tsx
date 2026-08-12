import { ArrowLeft, CalendarDays, Package, RefreshCw, Store } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sale, getOne } from '../api/resources';
import { money, paymentStatusLabel, paymentStatusTone, shortDate } from '../shared/format';
import { Badge, Button, CurrencyBadge, EmptyRow, StatCard } from '../shared/ui';

export function VentaDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    if (!id) return;
    setLoading(true); setError('');
    try { setSale(await getOne<Sale>(`/sales/${id}`)); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo cargar la venta'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [id]);

  if (loading) return <div className="detail-state">Cargando detalle de la venta...</div>;
  if (error || !sale) return <div className="detail-state error">{error || 'Venta no encontrada'} <Button variant="outline" onClick={() => void load()}><RefreshCw size={14} /> Reintentar</Button></div>;

  const quantity = sale.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  return <div className="page-stack">
    <div className="detail-header"><Button variant="outline" className="icon-btn" aria-label="Volver" onClick={() => navigate('/ventas')}><ArrowLeft size={16} /></Button><div><h1>Venta #{sale.id.slice(0, 8)}</h1><div className="detail-contact"><span><Store size={13} />{sale.wholesaler?.name ?? 'Sin mayorista'}</span><span><CalendarDays size={13} />{shortDate(sale.saleDate)}</span></div></div><div className="toolbar-spacer"/><Badge tone={paymentStatusTone(sale.status)}>{paymentStatusLabel(sale.status)}</Badge><Button variant="outline" onClick={() => void load()}><RefreshCw size={14}/> Actualizar</Button></div>
    <div className="operation-summary"><StatCard label="Total" value={money(sale.totalAmount)} /><StatCard label="Pagado" value={money(sale.paidAmount)} tone="green"/><StatCard label="Saldo" value={money(sale.balanceAmount)} tone={Number(sale.balanceAmount) > 0 ? 'amber' : 'green'}/><StatCard label="Equipos" value={String(quantity)}/></div>
    <div className="table-card detail-table"><div className="table-head"><span><Package size={14}/> Productos vendidos</span><CurrencyBadge>{sale.currency}</CurrencyBadge></div><table><thead><tr><th>Producto</th><th>IMEI</th><th>Cantidad</th><th>Precio unitario</th><th>Subtotal</th></tr></thead><tbody>{!sale.items?.length && <EmptyRow colSpan={5} label="Sin productos asociados"/>}{sale.items?.map((item) => <tr key={item.id}><td className="primary">{item.product?.name ?? item.externalProductName ?? '-'}</td><td className="mono-cell">{item.stockItem?.imei ?? '-'}</td><td>{item.quantity}</td><td>{money(item.unitPrice)}</td><td className="primary">{money(item.subtotalAmount)}</td></tr>)}</tbody></table></div>
    <div className="table-card detail-table"><div className="table-head"><span>Pagos aplicados</span><span>{sale.payments?.length ?? 0} pagos</span></div><table><thead><tr><th>Fecha</th><th>Monto</th><th>Moneda</th><th>Método</th><th>Observaciones</th></tr></thead><tbody>{!sale.payments?.length && <EmptyRow colSpan={5} label="Sin pagos registrados"/>}{sale.payments?.map((payment) => <tr key={payment.id}><td>{shortDate(payment.paymentDate)}</td><td className="primary">{money(payment.amount)}</td><td><CurrencyBadge>{payment.currency}</CurrencyBadge></td><td>{payment.method}</td><td>{payment.observations || '-'}</td></tr>)}</tbody></table></div>
    {sale.notes && <div className="notes-card"><strong>Notas</strong><p>{sale.notes}</p></div>}
  </div>;
}
