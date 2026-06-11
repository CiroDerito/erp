import { PaymentStatus, StockStatus } from '../api/resources';

export function money(value?: string | number | null) {
  const parsed = Number(value ?? 0);
  return `$ ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(parsed)}`;
}

export function shortDate(value?: string | null) {
  if (!value) return '-';
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

export function paymentStatusLabel(status: PaymentStatus) {
  return {
    paid: 'Pagada',
    partial: 'Parcial',
    pending: 'Pendiente',
  }[status];
}

export function paymentStatusTone(status: PaymentStatus) {
  return {
    paid: 'green',
    partial: 'amber',
    pending: 'red',
  }[status] as 'green' | 'amber' | 'red';
}

export function stockStatusLabel(status: StockStatus) {
  return {
    available: 'Disponible',
    reserved: 'Reservado',
    sold: 'Vendido',
    inactive: 'Inactivo',
  }[status];
}

export function stockStatusTone(status: StockStatus) {
  return {
    available: 'green',
    reserved: 'amber',
    sold: 'red',
    inactive: 'blue',
  }[status] as 'green' | 'amber' | 'red' | 'blue';
}
