import { PaymentStatus } from '../enums/payment-status.enum';

export function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

export function toMoney(value: number) {
  return value.toFixed(2);
}

export function resolvePaymentStatus(total: number, paid: number) {
  if (paid <= 0) {
    return PaymentStatus.PENDING;
  }

  if (paid >= total) {
    return PaymentStatus.PAID;
  }

  return PaymentStatus.PARTIAL;
}
