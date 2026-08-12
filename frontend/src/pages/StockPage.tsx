import { Camera, ListFilter, Pencil, Plus } from 'lucide-react';
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Currency, Purchase, StockItem, StockStatus, Supplier, createResource, updateResource } from '../api/resources';
import { useApiResource } from '../api/useApiResource';
import { money, shortDate, stockStatusLabel, stockStatusTone } from '../shared/format';
import { Badge, Button, CurrencyBadge, EmptyRow, Modal, PageHeader, StatCard, TableState } from '../shared/ui';

type DetectedBarcode = { rawValue: string };
type BarcodeDetectorInstance = { detect(source: HTMLVideoElement): Promise<DetectedBarcode[]> };
type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance;

export function StockPage() {
  const navigate = useNavigate();
  const { data: stock, loading, error, reload } = useApiResource<StockItem>('/stock');
  const { data: purchases, reload: reloadPurchases } = useApiResource<Purchase>('/purchases');
  const { data: suppliers } = useApiResource<Supplier>('/suppliers');
  const [scannedImei, setScannedImei] = useState('');
  const [showForm, setShowForm] = useState(true);
  const [editingStockItem, setEditingStockItem] = useState<StockItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [selectedPendingItemId, setSelectedPendingItemId] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [stockingScan, setStockingScan] = useState(false);
  const scannerInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const scanFrameRef = useRef<number | null>(null);
  const lastDetectedRef = useRef('');
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

  const selectedPendingItem = pendingPurchaseItems.find((item) => item.id === selectedPendingItemId);

  useEffect(() => {
    if (!pendingPurchaseItems.length) {
      setSelectedPendingItemId('');
      return;
    }
    if (!pendingPurchaseItems.some((item) => item.id === selectedPendingItemId)) {
      setSelectedPendingItemId(pendingPurchaseItems[0].id);
    }
  }, [pendingPurchaseItems, selectedPendingItemId]);

  function stopCamera() {
    if (scanFrameRef.current !== null) cancelAnimationFrame(scanFrameRef.current);
    scanFrameRef.current = null;
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  }

  useEffect(() => () => stopCamera(), []);

  async function stockScannedCode(rawCode: string) {
    const code = rawCode.trim();
    if (!code || stockingScan) return;
    if (!selectedPendingItem) {
      setScannerError('Selecciona un producto pendiente de stockear');
      return;
    }
    setStockingScan(true);
    setScannerError('');
    try {
      await createResource<StockItem, object>('/stock', {
        imei: code,
        barcode: code,
        purchaseItemId: selectedPendingItem.id,
        entryDate: new Date().toISOString().slice(0, 10),
        costAmount: selectedPendingItem.unitCost,
        costCurrency: selectedPendingItem.purchase.currency,
        status: 'available',
      });
      setScannedImei(code);
      stopCamera();
      await Promise.all([reload(), reloadPurchases()]);
    } catch (err) {
      setScannerError(err instanceof Error ? err.message : 'No se pudo stockear el código leído');
      lastDetectedRef.current = '';
    } finally {
      setStockingScan(false);
    }
  }

  async function openCameraScanner() {
    if (!selectedPendingItem) {
      setScannerError('No hay productos pendientes de stockear');
      return;
    }
    setScannerError('');
    lastDetectedRef.current = '';
    setCameraOpen(true);
  }

  useEffect(() => {
    if (!cameraOpen) return undefined;
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (cancelled) { stream.getTracks().forEach((track) => track.stop()); return; }
        cameraStreamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
        if (!Detector) {
          setScannerError('Este navegador no permite detección automática. Usa Chrome/Edge actualizado o la entrada manual.');
          return;
        }
        const detector = new Detector({ formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code', 'data_matrix'] });
        const detect = async () => {
          if (cancelled || video.readyState < 2) return;
          try {
            const codes = await detector.detect(video);
            const value = codes[0]?.rawValue?.trim();
            if (value && value !== lastDetectedRef.current) {
              lastDetectedRef.current = value;
              await stockScannedCode(value);
              return;
            }
          } catch { /* Se reintenta en el siguiente cuadro. */ }
          if (!cancelled) scanFrameRef.current = requestAnimationFrame(() => void detect());
        };
        scanFrameRef.current = requestAnimationFrame(() => void detect());
      } catch (err) {
        setScannerError(err instanceof Error ? `No se pudo abrir la cámara: ${err.message}` : 'No se pudo abrir la cámara');
      }
    }
    void startCamera();
    return () => { cancelled = true; };
  }, [cameraOpen]);

  function handleScannerKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      void stockScannedCode(scannedImei);
    }
  }

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
      <PageHeader title="Stock" action={<><Button variant="outline" onClick={() => navigate('/stock/detalle')}><ListFilter size={14} /> Ver detalle</Button><Button onClick={openCreateForm}><Plus size={14} /> Agregar producto</Button></>} />
      <Modal title="Escanear IMEI o código de barras" open={cameraOpen} onClose={stopCamera}>
        <div className="camera-scanner">
          <video ref={videoRef} className="camera-preview" playsInline muted />
          <div className="camera-target"><span /></div>
          <div className="camera-help">Apunta al código de <strong>{selectedPendingItem?.product?.name ?? 'producto'}</strong>. Se agregará al stock automáticamente.</div>
          {stockingScan && <div className="scanner-saving">Código detectado, guardando...</div>}
          {scannerError && <div className="form-error">{scannerError}</div>}
        </div>
      </Modal>
      <div className="stock-summary-grid">
        <div className="scanner-card">
          <div>
            <div className="stat-label">Ingreso por scanner</div>
            <div className="scanner-title">Leer IMEI o codigo de barras</div>
          </div>
          <div className="scanner-actions">
            <Button onClick={() => void openCameraScanner()} disabled={!pendingPurchaseItems.length || stockingScan}><Camera size={14} /> Abrir cámara</Button>
            <input
              ref={scannerInputRef}
              className="form-input mono-input"
              placeholder="Escanea con pistola, escribe y presiona Enter"
              value={scannedImei}
              onChange={(event) => setScannedImei(event.target.value)}
              onKeyDown={handleScannerKeyDown}
            />
          </div>
          <select className="form-input scanner-product-select" value={selectedPendingItemId} onChange={(event) => setSelectedPendingItemId(event.target.value)} disabled={!pendingPurchaseItems.length}>
            {!pendingPurchaseItems.length && <option value="">No hay productos pendientes</option>}
            {pendingPurchaseItems.map((item) => <option key={item.id} value={item.id}>{item.product?.name ?? 'Producto'} · {item.purchase.supplier?.name ?? 'Proveedor'} · pendientes {item.pending}</option>)}
          </select>
          {scannerError && !cameraOpen && <div className="scanner-inline-error">{scannerError}</div>}
          <div className="scanner-status">
            <span>Ultimo codigo leido</span>
            <strong>{stockingScan ? 'Guardando...' : scannedImei || 'Sin lectura'}</strong>
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
          {isEditing ? (
            <label>
              <span className="form-label">Producto</span>
              <input className="form-input" value={editingStockItem?.product?.name ?? 'Producto'} readOnly />
            </label>
          ) : (
            <label>
              <span className="form-label">Producto</span>
              <select className="form-input" name="purchaseItemId" defaultValue="" required>
                <option value="">Seleccionar producto</option>
                {pendingPurchaseItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.product?.name ?? 'Producto'} - {item.purchase.supplier?.name ?? 'Proveedor'} - por stockear {item.pending}
                  </option>
                ))}
              </select>
            </label>
          )}
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
              <option value="sold">Vendido</option>
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
