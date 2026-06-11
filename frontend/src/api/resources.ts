import { apiRequest } from './client';

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

export type Currency = 'ARS' | 'CHL' | 'USD';
export type PaymentStatus = 'paid' | 'partial' | 'pending';
export type StockStatus = 'available' | 'reserved' | 'sold' | 'inactive';

export type Wholesaler = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  isActive: boolean;
};

export type Supplier = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  isActive: boolean;
};

export type Product = {
  id: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  isActive: boolean;
};

export type StockItem = {
  id: string;
  imei: string;
  barcode?: string | null;
  entryDate: string;
  costAmount: string;
  costCurrency: Currency;
  status: StockStatus;
  product?: Product | null;
  supplier?: Supplier | null;
  purchaseItem?: {
    id: string;
    quantity: number;
    product?: Product | null;
    purchase?: {
      id: string;
      supplier?: Supplier | null;
    } | null;
  } | null;
};

export type Sale = {
  id: string;
  saleDate: string;
  dueDate?: string | null;
  totalAmount: string;
  paidAmount: string;
  balanceAmount: string;
  currency: Currency;
  status: PaymentStatus;
  notes?: string | null;
  wholesaler?: Wholesaler | null;
};

export type Purchase = {
  id: string;
  purchaseDate: string;
  totalAmount: string;
  paidAmount: string;
  balanceAmount: string;
  currency: Currency;
  status: PaymentStatus;
  notes?: string | null;
  supplier?: Supplier | null;
  items?: Array<{
    id: string;
    quantity: number;
    unitCost: string;
    subtotalAmount: string;
    product?: Product | null;
    stockItems?: StockItem[];
  }>;
};

export type Payment = {
  id: string;
  paymentDate: string;
  amount: string;
  currency: Currency;
  usdRateArs?: string | null;
  usdAmount?: string | null;
  method: string;
  observations?: string | null;
  wholesaler?: Wholesaler | null;
  sale?: Sale | null;
  supplier?: Supplier | null;
  purchase?: Purchase | null;
};

export type DashboardSummary = {
  totalSold: string;
  totalPurchased: string;
  profit: string;
  pendingBalance: string;
  salesCount: number;
  purchasesCount: number;
  byCurrency: Record<Currency, { sold: string; purchased: string; pending: string }>;
  overdueWholesalers: Array<{
    wholesalerId: string;
    name: string;
    daysWithoutPayment: number;
    pendingBalance: string;
  }>;
};

export function getResource<T>(path: string) {
  return apiRequest<PaginatedResponse<T>>(path);
}

export function createResource<T, TPayload extends object>(path: string, payload: TPayload) {
  return apiRequest<T>(path, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateResource<T, TPayload extends object>(path: string, payload: TPayload) {
  return apiRequest<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function getDashboard() {
  return apiRequest<DashboardSummary>('/dashboard');
}
