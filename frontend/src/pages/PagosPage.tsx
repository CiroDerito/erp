import { Plus } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { Currency, Payment, Purchase, Sale, Supplier, Wholesaler, createResource } from '../api/resources';
import { useApiResource } from '../api/useApiResource';
import { money, shortDate } from '../shared/format';
import { Button, CurrencyBadge, EmptyRow, PageHeader, TableState } from '../shared/ui';

export function PagosPage() {
  const { data, loading, error, reload } = useApiResource<Payment>('/payments');
  const { data: wholesalers } = useApiResource<Wholesaler>('/wholesalers');
  const { data: suppliers } = useApiResource<Supplier>('/suppliers');
  const { data: sales } = useApiResource<Sale>('/sales');
  const { data: purchases } = useApiResource<Purchase>('/purchases');
  const [targetType, setTargetType] = useState<'sale' | 'purchase'>('sale');
  const [amount, setAmount] = useState('200000');
  const [usdRateArs, setUsdRateArs] = useState('1250');
  const [currency, setCurrency] = useState<Currency>('ARS');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const usdAmount = useMemo(() => {
    const parsedAmount = Number(amount);
    const parsedRate = Number(usdRateArs);
    if (currency === 'USD') {
      return parsedAmount > 0 ? parsedAmount.toFixed(2) : '0.00';
    }
    return parsedAmount > 0 && parsedRate > 0 ? (parsedAmount / parsedRate).toFixed(2) : '0.00';
  }, [amount, currency, usdRateArs]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving(true);
    setFormError('');
    const form = new FormData(formElement);
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setSaving(false);
      setFormError('El monto debe ser mayor a 0');
      return;
    }

    try {
      await createResource<Payment, object>('/payments', {
        wholesalerId: targetType === 'sale' ? String(form.get('wholesalerId') ?? '') : undefined,
        saleId: targetType === 'sale' ? String(form.get('saleId') ?? '') || undefined : undefined,
        supplierId: targetType === 'purchase' ? String(form.get('supplierId') ?? '') : undefined,
        purchaseId: targetType === 'purchase' ? String(form.get('purchaseId') ?? '') || undefined : undefined,
        paymentDate: String(form.get('paymentDate') ?? ''),
        amount,
        currency,
        usdRateArs: currency === 'USD' ? '1' : usdRateArs,
        method: String(form.get('method') ?? 'transfer'),
        observations: String(form.get('observations') ?? ''),
      });
      formElement.reset();
      setAmount('0');
      setUsdRateArs('0');
      setCurrency('ARS');
      setTargetType('sale');
      await reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo registrar el pago');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader title="Pagos" action={<Button type="submit" form="payment-form" disabled={saving}><Plus size={14} /> {saving ? 'Registrando...' : 'Registrar pago'}</Button>} />
      <form className="form-card" id="payment-form" onSubmit={handleSubmit}>
        <div className="form-grid payment-grid">
          <label>
            <span className="form-label">Tipo</span>
            <select className="form-input" value={targetType} onChange={(event) => setTargetType(event.target.value as 'sale' | 'purchase')}>
              <option value="sale">Venta</option>
              <option value="purchase">Compra</option>
            </select>
          </label>
          {targetType === 'sale' ? (
            <>
              <label><span className="form-label">Mayorista</span><select className="form-input" name="wholesalerId" required><option value="">Seleccionar mayorista</option>{wholesalers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label><span className="form-label">Venta</span><select className="form-input" name="saleId" required><option value="">Seleccionar venta</option>{sales.map((item) => <option key={item.id} value={item.id}>#{item.id.slice(0, 8)} - {item.wholesaler?.name ?? 'Mayorista'} - saldo {money(item.balanceAmount)}</option>)}</select></label>
            </>
          ) : (
            <>
              <label><span className="form-label">Proveedor</span><select className="form-input" name="supplierId" required><option value="">Seleccionar proveedor</option>{suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label><span className="form-label">Compra</span><select className="form-input" name="purchaseId" required><option value="">Seleccionar compra</option>{purchases.map((item) => <option key={item.id} value={item.id}>#{item.id.slice(0, 8)} - {item.supplier?.name ?? 'Proveedor'} - saldo {money(item.balanceAmount)}</option>)}</select></label>
            </>
          )}
          <label><span className="form-label">Monto</span><input className="form-input" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
          <label><span className="form-label">Cotizacion USD</span><input className="form-input" value={currency === 'USD' ? '1' : usdRateArs} onChange={(event) => setUsdRateArs(event.target.value)} disabled={currency === 'USD'} /></label>
          <label><span className="form-label">Total USD</span><input className="form-input" value={usdAmount} readOnly /></label>
          <label><span className="form-label">Fecha</span><input className="form-input" name="paymentDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></label>
          <label><span className="form-label">Moneda</span><select className="form-input" value={currency} onChange={(event) => setCurrency(event.target.value as Currency)}><option value="ARS">ARS</option><option value="CHL">CHL</option><option value="USD">USD</option></select></label>
          <label><span className="form-label">Metodo</span><select className="form-input" name="method" defaultValue="transfer"><option value="transfer">Transferencia</option><option value="cash">Efectivo</option><option value="card">Tarjeta</option><option value="other">Otro</option></select></label>
          <label><span className="form-label">Observaciones</span><input className="form-input" name="observations" /></label>
        </div>
        {formError ? <div className="form-error">{formError}</div> : null}
      </form>
      <div className="table-card">
        <table>
          <thead><tr><th>#</th><th>Tipo</th><th>Cliente / Proveedor</th><th>Operacion</th><th>Fecha</th><th>Monto</th><th>Moneda</th><th>USD</th><th>Metodo</th><th>Observaciones</th></tr></thead>
          <tbody>
            <TableState loading={loading} error={error} colSpan={10} />
            {!loading && !error && data.length === 0 && <EmptyRow colSpan={10} label="Sin pagos registrados" />}
            {!loading && !error && data.map((payment, index) => (
              <tr key={payment.id}>
                <td>{index + 1}</td>
                <td>{payment.purchase ? 'Compra' : 'Venta'}</td>
                <td className="primary">{payment.purchase ? payment.supplier?.name ?? '-' : payment.wholesaler?.name ?? '-'}</td>
                <td>{payment.purchase?.id ? `#${payment.purchase.id.slice(0, 8)}` : payment.sale?.id ? `#${payment.sale.id.slice(0, 8)}` : '-'}</td>
                <td>{shortDate(payment.paymentDate)}</td>
                <td>{money(payment.amount)}</td>
                <td><CurrencyBadge>{payment.currency}</CurrencyBadge></td>
                <td>{payment.usdAmount ? `USD ${Number(payment.usdAmount).toFixed(2)}` : '-'}</td>
                <td>{payment.method}</td>
                <td>{payment.observations ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
