import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import { Currency } from '../common/enums/currency.enum';
import { PaymentMethod } from '../common/enums/payment-method.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { toMoney, toNumber } from '../common/utils/money';
import { Purchase, Sale, StockItem } from '../entities';

type CurrencySummary = Record<Currency, { sold: string; purchased: string; pending: string }>;
type ActiveBreakdown = Record<Currency, { cash: string; bank: string; currentAccount: string; stock: string; total: string }>;
type MonthRange = { month: string; start: string; end: string; previousEnd: string };

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Sale)
    private readonly salesRepository: Repository<Sale>,
    @InjectRepository(Purchase)
    private readonly purchasesRepository: Repository<Purchase>,
    @InjectRepository(StockItem)
    private readonly stockRepository: Repository<StockItem>,
  ) {}

  async getSummary(month?: string) {
    const range = this.getMonthRange(month);
    const [salesToEnd, monthlySales, monthlyPurchases, stockItems] = await Promise.all([
      this.salesRepository.find({
        where: { totalAmount: MoreThan('0'), saleDate: LessThanOrEqual(range.end) },
        relations: { wholesaler: true, payments: true },
      }),
      this.salesRepository.find({
        where: { totalAmount: MoreThan('0'), saleDate: Between(range.start, range.end) },
        relations: { wholesaler: true, payments: true },
      }),
      this.purchasesRepository.find({ where: { totalAmount: MoreThan('0'), purchaseDate: Between(range.start, range.end) } }),
      this.stockRepository.find({ where: { entryDate: LessThanOrEqual(range.end) }, relations: { saleItem: { sale: true } } }),
    ]);

    const totalSold = monthlySales.reduce((sum, sale) => sum + toNumber(sale.totalAmount), 0);
    const totalPurchased = monthlyPurchases.reduce((sum, purchase) => sum + toNumber(purchase.totalAmount), 0);
    const pendingBalance = this.getPendingAt(salesToEnd, range.end);
    const currencySummary = this.buildCurrencySummary(monthlySales, monthlyPurchases, salesToEnd, range.end);
    const activeBreakdown = this.buildActiveBreakdown(salesToEnd, stockItems, range.start, range.end);
    const capitalInitial = this.buildActiveBreakdown(salesToEnd, stockItems, undefined, range.previousEnd);

    return {
      month: range.month,
      totalSold: toMoney(totalSold),
      totalPurchased: toMoney(totalPurchased),
      profit: toMoney(totalSold - totalPurchased),
      pendingBalance: toMoney(pendingBalance),
      salesCount: monthlySales.length,
      purchasesCount: monthlyPurchases.length,
      byCurrency: currencySummary,
      activeBreakdown,
      capitalInitial,
      overdueWholesalers: this.findOverdueWholesalers(salesToEnd),
    };
  }

  private buildCurrencySummary(monthlySales: Sale[], monthlyPurchases: Purchase[], salesToEnd: Sale[], end: string): CurrencySummary {
    const summary = Object.values(Currency).reduce((acc, currency) => {
      acc[currency] = { sold: '0.00', purchased: '0.00', pending: '0.00' };
      return acc;
    }, {} as CurrencySummary);

    for (const sale of monthlySales) {
      const current = summary[sale.currency];
      current.sold = toMoney(toNumber(current.sold) + toNumber(sale.totalAmount));
    }

    for (const purchase of monthlyPurchases) {
      const current = summary[purchase.currency];
      current.purchased = toMoney(toNumber(current.purchased) + toNumber(purchase.totalAmount));
    }

    for (const sale of salesToEnd) {
      const current = summary[sale.currency];
      current.pending = toMoney(toNumber(current.pending) + this.getSaleBalanceAt(sale, end));
    }

    return summary;
  }

  private buildActiveBreakdown(sales: Sale[], stockItems: StockItem[], start: string | undefined, end: string): ActiveBreakdown {
    const summary = Object.values(Currency).reduce((acc, currency) => {
      acc[currency] = { cash: '0.00', bank: '0.00', currentAccount: '0.00', stock: '0.00', total: '0.00' };
      return acc;
    }, {} as ActiveBreakdown);

    for (const sale of sales) {
      const current = summary[sale.currency];
      current.currentAccount = toMoney(toNumber(current.currentAccount) + this.getSaleBalanceAt(sale, end));
      const uncategorizedPaid = this.getUncategorizedPaid(sale);
      if (uncategorizedPaid > 0 && this.isDateInRange(sale.saleDate, start, end)) {
        current.cash = toMoney(toNumber(current.cash) + uncategorizedPaid);
      }

      for (const payment of sale.payments) {
        if (!this.isDateInRange(payment.paymentDate, start, end)) {
          continue;
        }
        if (payment.method === PaymentMethod.CASH) {
          current.cash = toMoney(toNumber(current.cash) + toNumber(payment.amount));
        }
        if (payment.method === PaymentMethod.TRANSFER) {
          current.bank = toMoney(toNumber(current.bank) + toNumber(payment.amount));
        }
      }
    }

    for (const item of stockItems) {
      if (!this.isStockActiveAt(item, end)) {
        continue;
      }
      const current = summary[item.costCurrency];
      current.stock = toMoney(toNumber(current.stock) + toNumber(item.costAmount));
    }

    for (const current of Object.values(summary)) {
      current.total = toMoney(
        toNumber(current.cash) + toNumber(current.bank) + toNumber(current.currentAccount) + toNumber(current.stock),
      );
    }

    return summary;
  }

  private getMonthRange(month?: string): MonthRange {
    const today = new Date();
    const normalized = month && /^\d{4}-\d{2}$/.test(month) ? month : today.toISOString().slice(0, 7);
    const [year, monthIndex] = normalized.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, monthIndex - 1, 1));
    const endDate = new Date(Date.UTC(year, monthIndex, 0));
    const previousEnd = new Date(Date.UTC(year, monthIndex - 1, 0));

    return {
      month: normalized,
      start: startDate.toISOString().slice(0, 10),
      end: endDate.toISOString().slice(0, 10),
      previousEnd: previousEnd.toISOString().slice(0, 10),
    };
  }

  private isDateInRange(value: string | null | undefined, start: string | undefined, end: string) {
    if (!value) {
      return false;
    }
    const date = value.slice(0, 10);
    return (!start || date >= start) && date <= end;
  }

  private getUncategorizedPaid(sale: Sale) {
    const paymentsTotal = sale.payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);
    return Math.max(toNumber(sale.paidAmount) - paymentsTotal, 0);
  }

  private getSalePaidAt(sale: Sale, end: string) {
    const uncategorizedPaid = sale.saleDate <= end ? this.getUncategorizedPaid(sale) : 0;
    const paymentsTotal = sale.payments
      .filter((payment) => payment.paymentDate <= end)
      .reduce((sum, payment) => sum + toNumber(payment.amount), 0);

    return Math.min(toNumber(sale.totalAmount), uncategorizedPaid + paymentsTotal);
  }

  private getSaleBalanceAt(sale: Sale, end: string) {
    if (sale.saleDate > end) {
      return 0;
    }

    return Math.max(toNumber(sale.totalAmount) - this.getSalePaidAt(sale, end), 0);
  }

  private getPendingAt(sales: Sale[], end: string) {
    return sales.reduce((sum, sale) => sum + this.getSaleBalanceAt(sale, end), 0);
  }

  private isStockActiveAt(item: StockItem, end: string) {
    return item.entryDate <= end;
  }

  private findOverdueWholesalers(sales: Sale[]) {
    const today = new Date();
    const byWholesaler = new Map<string, { wholesalerId: string; name: string; daysWithoutPayment: number; pendingBalance: number }>();

    for (const sale of sales) {
      if (
        sale.status === PaymentStatus.PAID ||
        toNumber(sale.balanceAmount) <= 0 ||
        toNumber(sale.paidAmount) > 0 ||
        sale.payments.length > 0
      ) {
        continue;
      }

      const referenceDate = new Date(sale.dueDate ?? sale.saleDate);
      const daysWithoutPayment = Math.floor((today.getTime() - referenceDate.getTime()) / 86_400_000);
      if (daysWithoutPayment <= 11) {
        continue;
      }

      const existing = byWholesaler.get(sale.wholesaler.id);
      if (!existing || daysWithoutPayment > existing.daysWithoutPayment) {
        byWholesaler.set(sale.wholesaler.id, {
          wholesalerId: sale.wholesaler.id,
          name: sale.wholesaler.name,
          daysWithoutPayment,
          pendingBalance: toNumber(sale.balanceAmount) + (existing?.pendingBalance ?? 0),
        });
      } else {
        existing.pendingBalance += toNumber(sale.balanceAmount);
      }
    }

    return [...byWholesaler.values()]
      .map((item) => ({ ...item, pendingBalance: toMoney(item.pendingBalance) }))
      .sort((a, b) => b.daysWithoutPayment - a.daysWithoutPayment);
  }
}
