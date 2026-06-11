import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { Currency } from '../common/enums/currency.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { toMoney, toNumber } from '../common/utils/money';
import { Purchase, Sale } from '../entities';

type CurrencySummary = Record<Currency, { sold: string; purchased: string; pending: string }>;

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Sale)
    private readonly salesRepository: Repository<Sale>,
    @InjectRepository(Purchase)
    private readonly purchasesRepository: Repository<Purchase>,
  ) {}

  async getSummary() {
    const [sales, purchases] = await Promise.all([
      this.salesRepository.find({
        where: { totalAmount: MoreThan('0') },
        relations: { wholesaler: true, payments: true },
      }),
      this.purchasesRepository.find({ where: { totalAmount: MoreThan('0') } }),
    ]);

    const totalSold = sales.reduce((sum, sale) => sum + toNumber(sale.totalAmount), 0);
    const totalPurchased = purchases.reduce((sum, purchase) => sum + toNumber(purchase.totalAmount), 0);
    const pendingBalance = sales.reduce((sum, sale) => sum + toNumber(sale.balanceAmount), 0);
    const currencySummary = this.buildCurrencySummary(sales, purchases);

    return {
      totalSold: toMoney(totalSold),
      totalPurchased: toMoney(totalPurchased),
      profit: toMoney(totalSold - totalPurchased),
      pendingBalance: toMoney(pendingBalance),
      salesCount: sales.length,
      purchasesCount: purchases.length,
      byCurrency: currencySummary,
      overdueWholesalers: this.findOverdueWholesalers(sales),
    };
  }

  private buildCurrencySummary(sales: Sale[], purchases: Purchase[]): CurrencySummary {
    const summary = Object.values(Currency).reduce((acc, currency) => {
      acc[currency] = { sold: '0.00', purchased: '0.00', pending: '0.00' };
      return acc;
    }, {} as CurrencySummary);

    for (const sale of sales) {
      const current = summary[sale.currency];
      current.sold = toMoney(toNumber(current.sold) + toNumber(sale.totalAmount));
      current.pending = toMoney(toNumber(current.pending) + toNumber(sale.balanceAmount));
    }

    for (const purchase of purchases) {
      const current = summary[purchase.currency];
      current.purchased = toMoney(toNumber(current.purchased) + toNumber(purchase.totalAmount));
    }

    return summary;
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
