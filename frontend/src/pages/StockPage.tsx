import { Pencil, Plus, ScanLine } from 'lucide-react';
import { FormEvent, useMemo, useRef, useState } from 'react';
import { Currency, Purchase, StockItem, StockStatus, Supplier, createResource, updateResource } from '../api/resources';
import { useApiResource } from '../api/useApiResource';
import { money, shortDate, stockStatusLabel, stockStatusTone } from '../shared/format';
import { Badge, Button, CurrencyBadge, EmptyRow, PageHeader, StatCard, TableState } from '../shared/ui';

export function StockPage() {
  const { data: stock, loading, error, reload } = useApiResource<StockItem>('/stock');
  const { data: purchases } = useApiResource<Purchase>('/purchases');
  const { data: suppliers } = useApiResource<Supplier>('/suppliers');
  const [scannedImei, setScannedImei] = useState('');
  const [showForm, setShowForm] = useState(true);
  const [editingStockItem, setEditingStockItem] = useState<StockItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const scannerInputRef = useRef<HTMLInputElement>(null);
  const isEditing = Boolean(editingStockItem);

  const summary = useMemo(() => ({
    available: stock.filter((item) => item.status === 'available').length,
    reserved: stock.filter((item) => item.status === 'reserved').length,
    sold: stock.filter((item) => item.status === 'sold').length,
  }), [stock]);

  const pendingPurchaseItems = useMemo(() => {
    return purchases.flatMap((purchase) =>
      (purchase.items ?? []).map((item) => ({
        ...item,
        purchase,
        pending: Math.max(item.quantity - (item.stockItems?.length ?? 0), 0),
      })),
    ).filter((item) => item.pending > 0);
  }, [purchases]);

  function openCreateForm() {
    setEditingStockItem(null);
    setScannedImei('');
    setFormError('');
    setShowForm(true);
  }

  function openEditForm(item: StockItem) {
    setEditingStockItem(item);
    setScannedImei(item.imei);
    setFormError('');
    setShowForm(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving(true);
    setFormError('');
    const form = new FormData(formElement);
    const payload = {
      imei: String(form.get('imei') ?? ''),
      barcode: String(form.get('imei') ?? ''),
      purchaseItemId: String(form.get('purchaseItemId') ?? '') || undefined,
      supplierId: String(form.get('supplierId') ?? '') || undefined,
      entryDate: String(form.get('entryDate') ?? ''),
      costAmount: String(form.get('costAmount') ?? ''),
      costCurrency: String(form.get('costCurrency') ?? 'ARS') as Currency,
      status: String(form.get('status') ?? 'available') as StockStatus,
    };

    try {
      if (editingStockItem) {
        await updateResource<StockItem, object>(`/stock/${editingStockItem.id}`, payload);
      } else {
        await createResource<StockItem, object>('/stock', payload);
      }
      setScannedImei('');
      setEditingStockItem(null);
      formElement.reset();
      await reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo guardar el stock');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader title="Stock" action={<Button onClick={openCreateForm}><Plus size={14} /> Agregar producto</Button>} />
      <div className="stock-summary-grid">
        <div className="scanner-card">
          <div>
            <div className="stat-label">Ingreso por scanner</div>
            <div className="scanner-title">Leer IMEI o codigo de barras</div>
          </div>
          <div className="scanner-actions">
            <Button onClick={() => scannerInputRef.current?.focus()}><ScanLine size={14} /> Capturar scan</Button>
            <input
              ref={scannerInputRef}
              className="form-input mono-input"
              placeholder="Click aqui y escanea con la pistola o escribe manualmente"
              value={scannedImei}
              onChange={(event) => setScannedImei(event.target.value)}
            />
          </div>
          <div className="scanner-status">
            <span>Ultimo codigo leido</span>
            <strong>{scannedImei || 'Sin lectura'}</strong>
          </div>
        </div>
        <StatCard label="En stock" value={String(summary.available)} />
        <StatCard label="Reservados" value={String(summary.reserved)} tone="amber" />
        <StatCard label="Vendidos este mes" value={String(summary.sold)} tone="green" />
      </div>

      {showForm ? <form className="form-card" onSubmit={handleSubmit} key={editingStockItem?.id ?? 'new-stock'}>
        <div className="table-head">
          <span>{isEditing ? 'Editar producto' : 'Nuevo producto'}</span>
          <Button type="submit" variant="success" disabled={saving}>{saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Stockear producto'}</Button>
        </div>
        <div className="stock-form-grid">
          <label>
            <span className="form-label">IMEI</span>
            <input className="form-input mono-input" name="imei" placeholder="IMEI" value={scannedImei} onChange={(event) => setScannedImei(event.target.value)} required minLength={5} />
          </label>
          <label>
            <span className="form-label">Producto</span>
            <select className="form-input" name="purchaseItemId" defaultValue={editingStockItem?.purchaseItem?.id ?? ''} required disabled={isEditing}>
              <option value="">Seleccionar producto</option>
              {isEditing && editingStockItem?.purchaseItem ? (
                <option value={editingStockItem.purchaseItem.id}>{editingStockItem.product?.name ?? 'Producto'} - compra actual</option>
              ) : null}
              {pendingPurchaseItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.product?.name ?? 'Producto'} - {item.purchase.supplier?.name ?? 'Proveedor'} - por stockear {item.pending}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="form-label">Proveedor</span>
            <select className="form-input" name="supplierId" defaultValue={editingStockItem?.supplier?.id ?? ''}>
              <option value="">Seleccionar proveedor</option>
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
          </label>
          <label><span className="form-label">Ingreso</span><input className="form-input" name="entryDate" type="date" defaultValue={editingStockItem?.entryDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)} required /></label>
          <label><span className="form-label">Costo</span><input className="form-input" name="costAmount" placeholder="Costo" defaultValue={editingStockItem?.costAmount ?? ''} required /></label>
          <label>
            <span className="form-label">Moneda</span>
            <select className="form-input" name="costCurrency" defaultValue={editingStockItem?.costCurrency ?? 'ARS'}>
              <option value="ARS">ARS</option>
              <option value="CHL">CHL</option>
              <option value="USD">USD</option>
            </select>
          </label>
          <label>
            <span className="form-label">Estado</span>
            <select className="form-input" name="status" defaultValue={editingStockItem?.status ?? 'available'}>
              <option value="available">Disponible</option>
              <option value="reserved">Reservado</option>
              <option value="inactive">Inactivo</option>
            </select>
          </label>
        </div>
        {formError ? <div className="form-error">{formError}</div> : null}
      </form> : null}

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>IMEI / Codigo</th>
              <th>Proveedor</th>
              <th>Ingreso</th>
              <th>Costo</th>
              <th>Moneda</th>
              <th>Estado</th>
              <th className="actions-col"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            <TableState loading={loading} error={error} colSpan={8} />
            {!loading && !error && stock.length === 0 && <EmptyRow colSpan={8} label="Sin stock cargado" />}
            {!loading && !error && stock.map((item) => (
              <tr key={item.id}>
                <td className="primary">{item.product?.name ?? 'Producto sin nombre'}</td>
                <td>{item.imei}</td>
                <td>{item.supplier?.name ?? '-'}</td>
                <td>{shortDate(item.entryDate)}</td>
                <td>{money(item.costAmount)}</td>
                <td><CurrencyBadge>{item.costCurrency}</CurrencyBadge></td>
                <td><Badge tone={stockStatusTone(item.status)}>{stockStatusLabel(item.status)}</Badge></td>
                <td className="actions-col">
                  <Button variant="outline" className="icon-btn" aria-label={`Editar IMEI ${item.imei}`} title="Editar" onClick={() => openEditForm(item)}>
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
