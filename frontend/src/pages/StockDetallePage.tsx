import { ArrowLeft, ExternalLink, FilterX, RefreshCw, Search } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, StockItem, StockStatus, Supplier } from '../api/resources';
import { useApiResource } from '../api/useApiResource';
import { money, shortDate, stockStatusLabel, stockStatusTone } from '../shared/format';
import { Badge, Button, CurrencyBadge, EmptyRow, StatCard, TableState } from '../shared/ui';

export function StockDetallePage() {
  const navigate = useNavigate();
  const [supplierId, setSupplierId] = useState('');
  const [productId, setProductId] = useState('');
  const [status, setStatus] = useState<StockStatus | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const params = new URLSearchParams({ limit: '100' });
  if (supplierId) params.set('supplierId', supplierId);
  if (productId) params.set('productId', productId);
  if (status) params.set('status', status);
  if (search) params.set('search', search);

  const { data, total, loading, error, reload } = useApiResource<StockItem>(`/stock?${params.toString()}`);
  const { data: suppliers } = useApiResource<Supplier>('/suppliers?limit=100');
  const { data: products } = useApiResource<Product>('/products?limit=100');
  const totals = useMemo(() => ({
    available: data.filter((item) => item.status === 'available').length,
    reserved: data.filter((item) => item.status === 'reserved').length,
    sold: data.filter((item) => item.status === 'sold').length,
  }), [data]);

  function applySearch(event: FormEvent) { event.preventDefault(); setSearch(searchInput.trim()); }
  function clearFilters() { setSupplierId(''); setProductId(''); setStatus(''); setSearchInput(''); setSearch(''); }

  return <div className="page-stack">
    <div className="detail-header"><Button variant="outline" className="icon-btn" aria-label="Volver" onClick={() => navigate('/stock')}><ArrowLeft size={16}/></Button><div><h1>Detalle de stock</h1><div className="detail-contact">Inventario y trazabilidad por proveedor</div></div><div className="toolbar-spacer"/><Button variant="outline" onClick={() => void reload()}><RefreshCw size={14}/> Actualizar</Button></div>

    <form className="stock-detail-filters" onSubmit={applySearch}>
      <label><span className="form-label">Proveedor de origen</span><select className="form-input" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}><option value="">Todos los proveedores</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
      <label><span className="form-label">Producto</span><select className="form-input" value={productId} onChange={(event) => setProductId(event.target.value)}><option value="">Todos los productos</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
      <label><span className="form-label">Estado</span><select className="form-input" value={status} onChange={(event) => setStatus(event.target.value as StockStatus | '')}><option value="">Todos los estados</option><option value="available">Disponible</option><option value="reserved">Reservado</option><option value="sold">Vendido</option><option value="inactive">Inactivo</option></select></label>
      <label className="stock-search-filter"><span className="form-label">IMEI o código</span><div className="filter-search-row"><input className="form-input mono-input" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Buscar código"/><Button type="submit"><Search size={14}/></Button></div></label>
      <Button variant="outline" onClick={clearFilters}><FilterX size={14}/> Limpiar</Button>
    </form>

    <div className="operation-summary"><StatCard label="Resultados" value={String(total)}/><StatCard label="Disponibles" value={String(totals.available)} tone="green"/><StatCard label="Reservados" value={String(totals.reserved)} tone="amber"/><StatCard label="Vendidos" value={String(totals.sold)}/></div>

    <div className="table-card detail-table"><div className="table-head"><span>Unidades en inventario</span><span>{total} resultados</span></div><table><thead><tr><th>Producto</th><th>IMEI / código</th><th>Proveedor</th><th>Compra origen</th><th>Ingreso</th><th>Costo</th><th>Estado</th><th>Destino</th></tr></thead><tbody>
      <TableState loading={loading} error={error} colSpan={8}/>
      {!loading && !error && data.length === 0 && <EmptyRow colSpan={8} label="No hay unidades que coincidan con los filtros"/>}
      {!loading && !error && data.map((item) => <tr key={item.id}><td className="primary">{item.product?.name ?? '-'}</td><td><div className="stock-code"><strong>{item.imei}</strong>{item.barcode && item.barcode !== item.imei && <span>{item.barcode}</span>}</div></td><td>{item.supplier?.name ?? item.purchaseItem?.purchase?.supplier?.name ?? '-'}</td><td>{item.purchaseItem?.purchase?.id ? <button className="table-link" type="button" onClick={() => navigate(`/compras/${item.purchaseItem?.purchase?.id}`)}>#{item.purchaseItem.purchase.id.slice(0, 8)} <ExternalLink size={11}/></button> : 'Carga manual'}</td><td>{shortDate(item.entryDate)}</td><td>{money(item.costAmount)} <CurrencyBadge>{item.costCurrency}</CurrencyBadge></td><td><Badge tone={stockStatusTone(item.status)}>{stockStatusLabel(item.status)}</Badge></td><td>{item.saleItem?.sale ? <button className="table-link" type="button" onClick={() => navigate(`/ventas/${item.saleItem?.sale?.id}`)}>{item.saleItem.sale.wholesaler?.name ?? `Venta #${item.saleItem.sale.id.slice(0, 8)}`} <ExternalLink size={11}/></button> : item.status === 'available' ? 'En stock' : '-'}</td></tr>)}
    </tbody></table></div>
  </div>;
}
