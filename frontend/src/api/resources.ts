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
      purchaseDate?: string;
      currency?: Currency;
      supplier?: Supplier | null;
    } | null;
  } | null;
  saleItem?: {
    id: string;
    sale?: Sale | null;
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
  items?: SaleItem[];
  payments?: Payment[];
};

export type SaleItem = {
  id: string;
  quantity: number;
  unitPrice: string;
  subtotalAmount: string;
  isExternalProduct: boolean;
  externalProductName?: string | null;
  product?: Product | null;
  stockItem?: StockItem | null;
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
  payments?: Payment[];
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

export type WholesalerDetail = {
  wholesaler: Wholesaler;
  totals: Partial<Record<Currency, { sold: string; paid: string; balance: string }>>;
  sales: Sale[];
  payments: Payment[];
};

export type DashboardSummary = {
  month: string;
  totalSold: string;
  totalPurchased: string;
  profit: string;
  pendingBalance: string;
  salesCount: number;
  purchasesCount: number;
  byCurrency: Record<Currency, { sold: string; purchased: string; pending: string }>;
  activeBreakdown: Record<Currency, { cash: string; bank: string; currentAccount: string; stock: string; total: string }>;
  capitalInitial: Record<Currency, { cash: string; bank: string; currentAccount: string; stock: string; total: string }>;
  overdueWholesalers: Array<{
    wholesalerId: string;
    name: string;
    daysWithoutPayment: number;
    pendingBalance: string;
  }>;
};

export type MonthlySalesTotal = {
  month: string;
  salesCount: number;
  byCurrency: Partial<Record<Currency, string>>;
};

export type CashControlSummary = {
  date: string;
  month: string;
  initialCapital: Record<Currency, string>;
  dailyIncome: Record<Currency, string>;
  dailyExpense: Record<Currency, string>;
  closingToDay: Record<Currency, string>;
  monthClosing: Record<Currency, string>;
  capitalInitialBreakdown: CapitalBreakdown;
  capitalBreakdown: CapitalBreakdown;
  sales: Payment[];
  purchases: Payment[];
};

export type CapitalBreakdown = {
  cash: Record<Currency, string>;
  bank: Record<Currency, string>;
  currentAccount: Record<Currency, string>;
  stock: Record<Currency, string>;
  total: Record<Currency, string>;
};

export function getResource<T>(path: string) {
  return apiRequest<PaginatedResponse<T>>(path);
}

export function getOne<T>(path: string) {
  return apiRequest<T>(path);
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

export function getDashboard(month?: string) {
  return apiRequest<DashboardSummary>(`/dashboard${month ? `?month=${encodeURIComponent(month)}` : ''}`);
}

export function getMonthlySalesTotal(month: string) {
  return apiRequest<MonthlySalesTotal>(`/sales/monthly-total?month=${encodeURIComponent(month)}`);
}

export function getCashControl(date: string) {
  return apiRequest<CashControlSummary>(`/cash-control?date=${encodeURIComponent(date)}`);
}
