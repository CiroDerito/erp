import { ArrowLeft, CalendarDays, PackageCheck, RefreshCw, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Purchase, getOne } from '../api/resources';
import { money, paymentStatusLabel, paymentStatusTone, shortDate } from '../shared/format';
import { Badge, Button, CurrencyBadge, EmptyRow, StatCard } from '../shared/ui';

export function CompraDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  async function load() {
    if (!id) return;
    setLoading(true); setError('');
    try { setPurchase(await getOne<Purchase>(`/purchases/${id}`)); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo cargar la compra'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [id]);
  if (loading) return <div className="detail-state">Cargando detalle de la compra...</div>;
  if (error || !purchase) return <div className="detail-state error">{error || 'Compra no encontrada'} <Button variant="outline" onClick={() => void load()}><RefreshCw size={14}/> Reintentar</Button></div>;

  const quantity = purchase.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const stocked = purchase.items?.reduce((sum, item) => sum + (item.stockItems?.length ?? 0), 0) ?? 0;
  return <div className="page-stack">
    <div className="detail-header"><Button variant="outline" className="icon-btn" aria-label="Volver" onClick={() => navigate('/compras')}><ArrowLeft size={16}/></Button><div><h1>Compra #{purchase.id.slice(0, 8)}</h1><div className="detail-contact"><span><Truck size={13}/>{purchase.supplier?.name ?? 'Sin proveedor'}</span><span><CalendarDays size={13}/>{shortDate(purchase.purchaseDate)}</span></div></div><div className="toolbar-spacer"/><Badge tone={paymentStatusTone(purchase.status)}>{paymentStatusLabel(purchase.status)}</Badge><Button variant="outline" onClick={() => void load()}><RefreshCw size={14}/> Actualizar</Button></div>
    <div className="operation-summary"><StatCard label="Total" value={money(purchase.totalAmount)}/><StatCard label="Pagado" value={money(purchase.paidAmount)} tone="green"/><StatCard label="Saldo" value={money(purchase.balanceAmount)} tone={Number(purchase.balanceAmount) > 0 ? 'amber' : 'green'}/><StatCard label="Stock cargado" value={`${stocked} / ${quantity}`}/></div>
    <div className="table-card detail-table"><div className="table-head"><span><PackageCheck size={14}/> Productos comprados</span><CurrencyBadge>{purchase.currency}</CurrencyBadge></div><table><thead><tr><th>Producto</th><th>Cantidad</th><th>Stockeados</th><th>Pendientes</th><th>Costo unitario</th><th>Subtotal</th></tr></thead><tbody>{!purchase.items?.length && <EmptyRow colSpan={6} label="Sin productos asociados"/>}{purchase.items?.map((item) => <tr key={item.id}><td className="primary">{item.product?.name ?? '-'}</td><td>{item.quantity}</td><td>{item.stockItems?.length ?? 0}</td><td>{Math.max(item.quantity - (item.stockItems?.length ?? 0), 0)}</td><td>{money(item.unitCost)}</td><td className="primary">{money(item.subtotalAmount)}</td></tr>)}</tbody></table></div>
    <div className="table-card detail-table"><div className="table-head"><span>IMEI ingresados</span><span>{stocked} equipos</span></div><table><thead><tr><th>Producto</th><th>IMEI</th><th>Código de barras</th><th>Fecha ingreso</th><th>Estado</th></tr></thead><tbody>{stocked === 0 && <EmptyRow colSpan={5} label="Todavía no se ingresaron equipos al stock"/>}{purchase.items?.flatMap((item) => (item.stockItems ?? []).map((stock) => <tr key={stock.id}><td className="primary">{item.product?.name ?? '-'}</td><td className="mono-cell">{stock.imei}</td><td className="mono-cell">{stock.barcode ?? '-'}</td><td>{shortDate(stock.entryDate)}</td><td><Badge tone={stock.status === 'available' ? 'green' : stock.status === 'sold' ? 'blue' : 'amber'}>{stock.status}</Badge></td></tr>))}</tbody></table></div>
    <div className="table-card detail-table"><div className="table-head"><span>Pagos aplicados</span><span>{purchase.payments?.length ?? 0} pagos</span></div><table><thead><tr><th>Fecha</th><th>Monto</th><th>Moneda</th><th>Método</th><th>Observaciones</th></tr></thead><tbody>{!purchase.payments?.length && <EmptyRow colSpan={5} label="Sin pagos registrados"/>}{purchase.payments?.map((payment) => <tr key={payment.id}><td>{shortDate(payment.paymentDate)}</td><td className="primary">{money(payment.amount)}</td><td><CurrencyBadge>{payment.currency}</CurrencyBadge></td><td>{payment.method}</td><td>{payment.observations || '-'}</td></tr>)}</tbody></table></div>
    {purchase.notes && <div className="notes-card"><strong>Notas</strong><p>{purchase.notes}</p></div>}
  </div>;
}
