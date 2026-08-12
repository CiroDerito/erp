import { ArrowDownLeft, ArrowUpRight, Banknote, Boxes, Building2, CalendarDays, RefreshCw, Wallet } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CashControlSummary, Currency, Payment, getCashControl } from '../api/resources';
import { money, shortDate } from '../shared/format';
import { Button, CurrencyBadge, EmptyRow } from '../shared/ui';

const currencies: Currency[] = ['ARS', 'USD', 'CHL'];
const empty = { ARS: '0.00', USD: '0.00', CHL: '0.00' } as Record<Currency, string>;

function CashCard({ label, values, tone, icon }: { label: string; values: Record<Currency, string>; tone?: string; icon: ReactNode }) {
  return <div className={`cash-card ${tone ?? ''}`}><div className="cash-card-head"><span>{icon}{label}</span></div><div className="cash-values">{currencies.map((currency) => <div key={currency}><CurrencyBadge>{currency}</CurrencyBadge><strong>{money(values[currency])}</strong></div>)}</div></div>;
}

function MovementsTable({ title, payments, type, onOpen }: { title: string; payments: Payment[]; type: 'sale' | 'purchase'; onOpen: (payment: Payment) => void }) {
  return <div className="table-card detail-table"><div className="table-head"><span>{title}</span><span>{payments.length} movimientos</span></div><table><thead><tr><th>Fecha</th><th>{type === 'sale' ? 'Mayorista' : 'Proveedor'}</th><th>Operación</th><th>Monto</th><th>Moneda</th><th>Observaciones</th></tr></thead><tbody>{payments.length === 0 && <EmptyRow colSpan={6} label={type === 'sale' ? 'Sin cobros en efectivo este día' : 'Sin pagos en efectivo este día'}/>} {payments.map((payment) => <tr key={payment.id}><td>{shortDate(payment.paymentDate)}</td><td className="primary">{type === 'sale' ? payment.wholesaler?.name ?? '-' : payment.supplier?.name ?? '-'}</td><td><button type="button" className="table-link" onClick={() => onOpen(payment)}>#{(type === 'sale' ? payment.sale?.id : payment.purchase?.id)?.slice(0, 8)}</button></td><td className="primary">{money(payment.amount)}</td><td><CurrencyBadge>{payment.currency}</CurrencyBadge></td><td>{payment.observations || '-'}</td></tr>)}</tbody></table></div>;
}

export function CajaPage() {
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState<CashControlSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  async function load() { setLoading(true); setError(''); try { setSummary(await getCashControl(date)); } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo cargar la caja'); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, [date]);
  return <div className="page-stack"><div className="detail-header"><div><h1>Control de caja</h1><div className="detail-contact"><span><Wallet size={13}/>Solo movimientos en efectivo</span></div></div><div className="toolbar-spacer"/><div className="cash-date-controls"><label><span className="form-label">Día a controlar</span><input className="form-input" type="date" value={date} onChange={(event) => setDate(event.target.value)}/></label><Button variant="outline" onClick={() => void load()}><RefreshCw size={14}/> Actualizar</Button></div></div>
    {error && <div className="form-error">{error}</div>}{loading && !summary && <div className="detail-state">Calculando caja...</div>}
    <div className="cash-grid"><CashCard label="Capital inicial del mes" values={summary?.initialCapital ?? empty} icon={<CalendarDays size={14}/>}/><CashCard label="Ingresos del día" values={summary?.dailyIncome ?? empty} tone="cash-positive" icon={<ArrowDownLeft size={14}/>}/><CashCard label="Egresos del día" values={summary?.dailyExpense ?? empty} tone="cash-negative" icon={<ArrowUpRight size={14}/>}/><CashCard label="Capital al cierre del día" values={summary?.closingToDay ?? empty} tone="cash-closing" icon={<Wallet size={14}/>}/></div>
    <div className="cash-rule">El capital inicial de {summary?.month ?? date.slice(0, 7)} es el capital final acumulado al cierre del mes anterior. Los importes sin método “Efectivo” quedan excluidos.</div>
    <div className="capital-section-head"><div><h2>Capital total</h2><p>Composición patrimonial a la fecha seleccionada. Este resumen no modifica el control diario exclusivo de efectivo.</p></div></div>
    <div className="capital-total-grid"><CashCard label="Efectivo" values={summary?.capitalBreakdown.cash ?? empty} icon={<Banknote size={14}/>}/><CashCard label="Banco" values={summary?.capitalBreakdown.bank ?? empty} icon={<Building2 size={14}/>}/><CashCard label="Cuenta corriente" values={summary?.capitalBreakdown.currentAccount ?? empty} icon={<CalendarDays size={14}/>}/><CashCard label="Stock valorizado" values={summary?.capitalBreakdown.stock ?? empty} icon={<Boxes size={14}/>}/><CashCard label="Capital total" values={summary?.capitalBreakdown.total ?? empty} tone="cash-closing" icon={<Wallet size={14}/>}/></div>
    <div className="capital-previous"><strong>Capital inicial total del mes (cierre anterior):</strong>{currencies.map((currency) => <span key={currency}><CurrencyBadge>{currency}</CurrencyBadge>{money(summary?.capitalInitialBreakdown.total[currency] ?? 0)}</span>)}</div>
    <MovementsTable title="Ventas cobradas en efectivo" payments={summary?.sales ?? []} type="sale" onOpen={(payment) => payment.sale && navigate(`/ventas/${payment.sale.id}`)}/><MovementsTable title="Compras pagadas en efectivo" payments={summary?.purchases ?? []} type="purchase" onOpen={(payment) => payment.purchase && navigate(`/compras/${payment.purchase.id}`)}/></div>;
}
