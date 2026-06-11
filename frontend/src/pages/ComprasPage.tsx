import { Pencil, Plus } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Currency, Purchase, Supplier, createResource, updateResource } from '../api/resources';
import { useApiResource } from '../api/useApiResource';
import { money, paymentStatusLabel, paymentStatusTone, shortDate } from '../shared/format';
import { Badge, Button, CurrencyBadge, EmptyRow, Modal, PageHeader, StatCard, TableState } from '../shared/ui';

export function ComprasPage() {
  const { data, loading, error, reload } = useApiResource<Purchase>('/purchases');
  const { data: suppliers } = useApiResource<Supplier>('/suppliers');
  const [open, setOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const isEditing = Boolean(editingPurchase);
  const totalPurchased = data.reduce((sum, item) => sum + Number(item.totalAmount), 0);
  const totalPaid = data.reduce((sum, item) => sum + Number(item.paidAmount), 0);
  const totalBalance = data.reduce((sum, item) => sum + Number(item.balanceAmount), 0);

  function getPurchaseQuantity(purchase: Purchase) {
    return purchase.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  }

  function getPendingToStock(purchase: Purchase) {
    return purchase.items?.reduce((sum, item) => sum + Math.max(item.quantity - (item.stockItems?.length ?? 0), 0), 0) ?? 0;
  }

  function getFirstItem(purchase: Purchase | null) {
    return purchase?.items?.[0] ?? null;
  }

  function openCreateModal() {
    setEditingPurchase(null);
    setFormError('');
    setOpen(true);
  }

  function openEditModal(purchase: Purchase) {
    setEditingPurchase(purchase);
    setFormError('');
    setOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving(true);
    setFormError('');
    const form = new FormData(formElement);
    const quantity = Number(form.get('quantity') ?? 0);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setSaving(false);
      setFormError('La cantidad debe ser mayor a 0');
      return;
    }

    const unitCost = Number(form.get('unitCost') ?? 0);
    if (!Number.isFinite(unitCost) || unitCost <= 0) {
      setSaving(false);
      setFormError('El costo unitario debe ser mayor a 0');
      return;
    }

    const paidAmount = Number(form.get('paidAmount') ?? 0);
    if (!Number.isFinite(paidAmount) || paidAmount < 0) {
      setSaving(false);
      setFormError('El pagado no puede ser menor a 0');
      return;
    }

    try {
      const payload = {
        supplierId: String(form.get('supplierId') ?? ''),
        purchaseDate: String(form.get('purchaseDate') ?? ''),
        currency: String(form.get('currency') ?? 'ARS') as Currency,
        paidAmount: String(paidAmount),
        notes: String(form.get('notes') ?? ''),
        items: [{
          productName: String(form.get('productName') ?? ''),
          quantity,
          unitCost: String(unitCost),
          stockCodes: [],
        }],
      };

      if (editingPurchase) {
        await updateResource<Purchase, object>(`/purchases/${editingPurchase.id}`, payload);
      } else {
        await createResource<Purchase, object>('/purchases', payload);
      }
      setOpen(false);
      setEditingPurchase(null);
      formElement.reset();
      await reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo guardar la compra');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader title="Compras" action={<Button onClick={openCreateModal}><Plus size={14} /> Nueva compra</Button>} />
      <Modal title={isEditing ? 'Editar compra' : 'Nueva compra'} open={open} onClose={() => setOpen(false)}>
        <form className="modal-form" onSubmit={handleSubmit} key={editingPurchase?.id ?? 'new-purchase'}>
          <label><span className="form-label">Proveedor</span><select className="form-input" name="supplierId" defaultValue={editingPurchase?.supplier?.id ?? ''} required><option value="">Seleccionar proveedor</option>{suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label><span className="form-label">Producto</span><input className="form-input" name="productName" placeholder="Nombre del producto" defaultValue={getFirstItem(editingPurchase)?.product?.name ?? ''} required minLength={2} /></label>
          <label><span className="form-label">Cantidad</span><input className="form-input" name="quantity" type="number" min={1} step={1} defaultValue={getFirstItem(editingPurchase)?.quantity ?? 1} required /></label>
          <label><span className="form-label">Fecha</span><input className="form-input" name="purchaseDate" type="date" defaultValue={editingPurchase?.purchaseDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)} required /></label>
          <label><span className="form-label">Costo unitario</span><input className="form-input" name="unitCost" type="number" min={0.01} step="0.01" defaultValue={getFirstItem(editingPurchase)?.unitCost ?? ''} required /></label>
          <label><span className="form-label">Pagado</span><input className="form-input" name="paidAmount" type="number" min={0} step="0.01" defaultValue={editingPurchase?.paidAmount ?? '0'} /></label>
          <label><span className="form-label">Moneda</span><select className="form-input" name="currency" defaultValue={editingPurchase?.currency ?? 'ARS'}><option value="ARS">ARS</option><option value="CHL">CHL</option><option value="USD">USD</option></select></label>
          <label><span className="form-label">Notas</span><input className="form-input" name="notes" defaultValue={editingPurchase?.notes ?? ''} /></label>
          {formError ? <div className="form-error">{formError}</div> : null}
          <div className="modal-actions">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Guardar compra'}</Button>
          </div>
        </form>
      </Modal>
      <div className="mini-grid">
        <StatCard label="Total comprado" value={money(totalPurchased)} />
        <StatCard label="Total pagado" value={money(totalPaid)} tone="green" />
        <StatCard label="Saldo proveedores" value={money(totalBalance)} tone="amber" />
      </div>
      <div className="table-card">
        <table>
          <thead>
            <tr><th>#</th><th>Proveedor</th><th>Cantidad</th><th>Por stockear</th><th>Fecha</th><th>Total</th><th>Pagado</th><th>Moneda</th><th>Saldo</th><th>Estado</th><th className="actions-col"><span className="sr-only">Acciones</span></th></tr>
          </thead>
          <tbody>
            <TableState loading={loading} error={error} colSpan={11} />
            {!loading && !error && data.length === 0 ? <EmptyRow colSpan={11} /> : null}
            {data.map((purchase, index) => (
              <tr key={purchase.id}>
                <td>{index + 1}</td>
                <td className="primary">{purchase.supplier?.name ?? '-'}</td>
                <td>{getPurchaseQuantity(purchase)}</td>
                <td>{getPendingToStock(purchase)}</td>
                <td>{shortDate(purchase.purchaseDate)}</td>
                <td>{money(purchase.totalAmount)}</td>
                <td>{money(purchase.paidAmount)}</td>
                <td><CurrencyBadge>{purchase.currency}</CurrencyBadge></td>
                <td>{money(purchase.balanceAmount)}</td>
                <td><Badge tone={paymentStatusTone(purchase.status)}>{paymentStatusLabel(purchase.status)}</Badge></td>
                <td className="actions-col">
                  <Button variant="outline" className="icon-btn" aria-label={`Editar compra ${index + 1}`} title="Editar" onClick={() => openEditModal(purchase)}>
                    <Pencil size={14} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
