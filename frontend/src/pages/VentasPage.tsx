import { Pencil, Plus } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { Currency, Sale, StockItem, Wholesaler, createResource, updateResource } from '../api/resources';
import { useApiResource } from '../api/useApiResource';
import { money, paymentStatusLabel, paymentStatusTone, shortDate } from '../shared/format';
import { Badge, Button, CurrencyBadge, EmptyRow, Modal, PageHeader, TableState } from '../shared/ui';

export function VentasPage() {
  const { data, loading, error, reload } = useApiResource<Sale>('/sales');
  const { data: wholesalers } = useApiResource<Wholesaler>('/wholesalers');
  const { data: stock } = useApiResource<StockItem>('/stock');
  const [open, setOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [search, setSearch] = useState('');
  const [onlyPending, setOnlyPending] = useState(false);
  const [productLineCount, setProductLineCount] = useState(1);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(['']);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const isEditing = Boolean(editingSale);

  const availableStock = stock.filter((item) => item.status === 'available');
  const availableProducts = useMemo(() => {
    const productsById = new Map<string, { id: string; name: string; count: number; stockItems: StockItem[] }>();

    for (const item of availableStock) {
      if (!item.product?.id) continue;
      const current = productsById.get(item.product.id) ?? { id: item.product.id, name: item.product.name, count: 0, stockItems: [] };
      current.count += 1;
      current.stockItems.push(item);
      productsById.set(item.product.id, current);
    }

    return Array.from(productsById.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [availableStock]);

  const filteredData = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.filter((sale) => {
      const matchesSearch = !term || sale.wholesaler?.name.toLowerCase().includes(term) || sale.id.toLowerCase().includes(term);
      const matchesStatus = !onlyPending || sale.status !== 'paid';
      return matchesSearch && matchesStatus;
    });
  }, [data, onlyPending, search]);

  function handleProductLineCountChange(value: number) {
    setProductLineCount(value);
    setSelectedProductIds((current) => Array.from({ length: value }, (_, index) => current[index] ?? ''));
  }

  function handleProductSelection(index: number, productId: string) {
    setSelectedProductIds((current) => {
      const next = [...current];
      next[index] = productId;
      return next;
    });
  }

  function getProductAvailableCount(productId: string) {
    return availableProducts.find((product) => product.id === productId)?.count ?? 0;
  }

  function getSelectableProducts(lineIndex: number) {
    const selectedInOtherLines = new Set(selectedProductIds.filter((productId, index) => productId && index !== lineIndex));
    return availableProducts.filter((product) => !selectedInOtherLines.has(product.id));
  }

  function openCreateModal() {
    setEditingSale(null);
    setFormError('');
    setProductLineCount(1);
    setSelectedProductIds(['']);
    setOpen(true);
  }

  function openEditModal(sale: Sale) {
    setEditingSale(sale);
    setFormError('');
    setOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving(true);
    setFormError('');
    const form = new FormData(formElement);
    const paidAmount = Number(form.get('paidAmount') ?? 0);

    if (!Number.isFinite(paidAmount) || paidAmount < 0) {
      setSaving(false);
      setFormError('El pagado no puede ser menor a 0');
      return;
    }

    if (editingSale) {
      try {
        await updateResource<Sale, object>(`/sales/${editingSale.id}`, {
          wholesalerId: String(form.get('wholesalerId') ?? ''),
          saleDate: String(form.get('saleDate') ?? ''),
          dueDate: String(form.get('dueDate') ?? '') || undefined,
          currency: String(form.get('currency') ?? 'ARS') as Currency,
          paidAmount: String(paidAmount),
          notes: String(form.get('notes') ?? ''),
        });
        setOpen(false);
        setEditingSale(null);
        formElement.reset();
        await reload();
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'No se pudo guardar la venta');
      } finally {
        setSaving(false);
      }
      return;
    }

    const usedByProduct = new Map<string, number>();
    const saleItems: Array<{ stockItemId: string; quantity: number; unitPrice: string }> = [];

    for (let index = 0; index < productLineCount; index += 1) {
      const productId = String(form.get(`productId-${index}`) ?? '');
      const quantity = Number(form.get(`quantity-${index}`) ?? 0);
      const unitPrice = Number(form.get(`unitPrice-${index}`) ?? 0);

      if (!productId) {
        setSaving(false);
        setFormError(`Primero selecciona un producto en stock ${index + 1}`);
        return;
      }
      if (!Number.isFinite(quantity) || quantity <= 0) {
        setSaving(false);
        setFormError(`La cantidad del producto ${index + 1} debe ser mayor a 0`);
        return;
      }
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        setSaving(false);
        setFormError(`El precio unitario del producto ${index + 1} debe ser mayor a 0`);
        return;
      }

      const productStock = availableProducts.find((product) => product.id === productId)?.stockItems ?? [];
      const alreadyUsed = usedByProduct.get(productId) ?? 0;
      if (alreadyUsed + quantity > productStock.length) {
        setSaving(false);
        setFormError(`No hay stock suficiente para el producto ${index + 1}`);
        return;
      }

      productStock.slice(alreadyUsed, alreadyUsed + quantity).forEach((stockItem) => {
        saleItems.push({ stockItemId: stockItem.id, quantity: 1, unitPrice: String(unitPrice) });
      });
      usedByProduct.set(productId, alreadyUsed + quantity);
    }

    try {
      await createResource<Sale, object>('/sales', {
        wholesalerId: String(form.get('wholesalerId') ?? ''),
        saleDate: String(form.get('saleDate') ?? ''),
        dueDate: String(form.get('dueDate') ?? '') || undefined,
        currency: String(form.get('currency') ?? 'ARS') as Currency,
        paidAmount: String(paidAmount),
        notes: String(form.get('notes') ?? ''),
        items: saleItems,
      });
      setOpen(false);
      formElement.reset();
      setProductLineCount(1);
      setSelectedProductIds(['']);
      await reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo crear la venta');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader title="Ventas" action={<Button onClick={openCreateModal}><Plus size={14} /> Nueva venta</Button>} />
      <Modal title={isEditing ? 'Editar venta' : 'Nueva venta'} open={open} onClose={() => setOpen(false)}>
        <form className="modal-form" onSubmit={handleSubmit} key={editingSale?.id ?? 'new-sale'}>
          <label><span className="form-label">Mayorista</span><select className="form-input" name="wholesalerId" defaultValue={editingSale?.wholesaler?.id ?? ''} required><option value="">Seleccionar mayorista</option>{wholesalers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          {isEditing ? null : <label>
            <span className="form-label">Cantidad de productos</span>
            <select className="form-input" value={productLineCount} onChange={(event) => handleProductLineCountChange(Number(event.target.value))}>
              {[1, 2, 3, 4, 5].map((count) => <option key={count} value={count}>{count}</option>)}
            </select>
          </label>}
          {!isEditing && Array.from({ length: productLineCount }, (_, index) => {
            const selectedProductId = selectedProductIds[index] ?? '';
            const availableCount = getProductAvailableCount(selectedProductId);
            const selectableProducts = getSelectableProducts(index);

            return (
              <div className="line-form-grid" key={index}>
                <label>
                  <span className="form-label">Producto en stock {index + 1}</span>
                  <select className="form-input" name={`productId-${index}`} value={selectedProductId} onChange={(event) => handleProductSelection(index, event.target.value)} required>
                    <option value="">Seleccionar producto</option>
                    {selectableProducts.map((product) => <option key={product.id} value={product.id}>{product.name} - disponibles {product.count}</option>)}
                  </select>
                </label>
                <label>
                  <span className="form-label">Cantidad producto {index + 1}</span>
                  <select className="form-input" name={`quantity-${index}`} disabled={!selectedProductId} required>
                    {!selectedProductId ? (
                      <option value="">Primero selecciona un producto</option>
                    ) : (
                      Array.from({ length: availableCount }, (_, quantityIndex) => quantityIndex + 1).map((quantity) => (
                        <option key={quantity} value={quantity}>{quantity}</option>
                      ))
                    )}
                  </select>
                </label>
                <label>
                  <span className="form-label">Precio unitario {index + 1}</span>
                  <input className="form-input" name={`unitPrice-${index}`} type="number" min={0.01} step="0.01" required />
                </label>
              </div>
            );
          })}
          <label><span className="form-label">Fecha</span><input className="form-input" name="saleDate" type="date" defaultValue={editingSale?.saleDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)} required /></label>
          <label><span className="form-label">Vencimiento</span><input className="form-input" name="dueDate" type="date" defaultValue={editingSale?.dueDate?.slice(0, 10) ?? ''} /></label>
          <label><span className="form-label">Pagado</span><input className="form-input" name="paidAmount" type="number" min={0} step="0.01" defaultValue={editingSale?.paidAmount ?? '0'} /></label>
          <label><span className="form-label">Moneda</span><select className="form-input" name="currency" defaultValue={editingSale?.currency ?? 'ARS'}><option value="ARS">ARS</option><option value="CHL">CHL</option><option value="USD">USD</option></select></label>
          <label><span className="form-label">Notas</span><input className="form-input" name="notes" defaultValue={editingSale?.notes ?? ''} /></label>
          {isEditing ? <div className="form-help">Los productos vendidos no se editan desde aca para conservar el movimiento de stock por IMEI.</div> : null}
          {formError ? <div className="form-error">{formError}</div> : null}
          <div className="modal-actions">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? isEditing ? 'Guardando...' : 'Generando...' : isEditing ? 'Guardar cambios' : 'Generar venta'}</Button>
          </div>
        </form>
      </Modal>
      <div className="table-card">
        <div className="toolbar">
          <input className="search-input" placeholder="Buscar venta o mayorista..." value={search} onChange={(event) => setSearch(event.target.value)} />
          <Button variant="outline" onClick={() => setOnlyPending((current) => !current)}>{onlyPending ? 'Ver todas' : 'Filtros'}</Button>
        </div>
        {onlyPending ? <div className="inline-filter"><Badge tone="amber">Pendientes y parciales</Badge></div> : null}
        <table>
          <thead>
            <tr><th>#</th><th>Mayorista</th><th>Fecha</th><th>Total</th><th>Pagado</th><th>Moneda</th><th>Saldo</th><th>Estado</th><th className="actions-col"><span className="sr-only">Acciones</span></th></tr>
          </thead>
          <tbody>
            <TableState loading={loading} error={error} colSpan={9} />
            {!loading && !error && filteredData.length === 0 ? <EmptyRow colSpan={9} /> : null}
            {filteredData.map((sale, index) => (
              <tr key={sale.id}>
                <td>{index + 1}</td>
                <td className="primary">{sale.wholesaler?.name ?? '-'}</td>
                <td>{shortDate(sale.saleDate)}</td>
                <td>{money(sale.totalAmount)}</td>
                <td>{money(sale.paidAmount)}</td>
                <td><CurrencyBadge>{sale.currency}</CurrencyBadge></td>
                <td>{money(sale.balanceAmount)}</td>
                <td><Badge tone={paymentStatusTone(sale.status)}>{paymentStatusLabel(sale.status)}</Badge></td>
                <td className="actions-col">
                  <Button variant="outline" className="icon-btn" aria-label={`Editar venta ${index + 1}`} title="Editar" onClick={() => openEditModal(sale)}>
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
