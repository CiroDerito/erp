export type ApiError = {
  message: string;
  statusCode?: number;
};

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';

function translateApiMessage(message?: string | string[]) {
  const rawMessage = Array.isArray(message) ? message.join('. ') : message;
  if (!rawMessage) return 'No se pudo completar la operacion';

  const translations: Record<string, string> = {
    'Purchase not found': 'Compra no encontrada',
    'Supplier not found': 'Proveedor no encontrado',
    'Product not found': 'Producto no encontrado',
    'Wholesaler not found': 'Mayorista no encontrado',
    'Sale not found': 'Venta no encontrada',
    'Stock item not found': 'Producto de stock no encontrado',
    'Product name is required': 'El nombre del producto es obligatorio',
    'Quantity must be greater than 0': 'La cantidad debe ser mayor a 0',
    'Unit cost must be greater than 0': 'El costo unitario debe ser mayor a 0',
    'Paid amount cannot be negative': 'El pagado no puede ser menor a 0',
    'Duplicated IMEI in purchase payload': 'Hay IMEIs duplicados en la compra',
    'Stock codes cannot exceed purchase item quantity': 'La cantidad de IMEIs no puede superar la cantidad comprada',
    'No se pudo completar la operacion': 'No se pudo completar la operacion',
  };

  if (translations[rawMessage]) return translations[rawMessage];
  if (rawMessage.includes('IMEI already exists')) return rawMessage.replace('IMEI already exists', 'El IMEI ya existe');

  return rawMessage;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('erp_access_token');
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiError | null;
    throw new Error(translateApiMessage(body?.message));
  }

  return response.json() as Promise<T>;
}
