import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, LessThanOrEqual, Repository } from 'typeorm';
import { Currency } from '../common/enums/currency.enum';
import { PaymentMethod } from '../common/enums/payment-method.enum';
import { toMoney, toNumber } from '../common/utils/money';
import { Payment, Purchase, Sale, StockItem } from '../entities';

type Amounts = Record<Currency, number>;

@Injectable()
export class CashControlService {
  constructor(
    @InjectRepository(Payment) private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(Sale) private readonly salesRepository: Repository<Sale>,
    @InjectRepository(Purchase) private readonly purchasesRepository: Repository<Purchase>,
    @InjectRepository(StockItem) private readonly stockRepository: Repository<StockItem>,
  ) {}

  async getSummary(date?: string) {
    const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(date ?? '') ? date! : new Date().toISOString().slice(0, 10);
    const monthStart = `${selectedDate.slice(0, 7)}-01`;
    const [year, month] = selectedDate.slice(0, 7).split('-').map(Number);
    const monthEnd = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
    const previousMonthEnd = new Date(Date.UTC(year, month - 1, 0)).toISOString().slice(0, 10);
    const relations = { wholesaler: true, sale: true, supplier: true, purchase: true } as const;
    const [beforeMonth, throughSelectedDay, throughMonthEnd, initialBreakdown, currentBreakdown] = await Promise.all([
      this.paymentsRepository.find({ where: { method: PaymentMethod.CASH, paymentDate: LessThan(monthStart) }, relations }),
      this.paymentsRepository.find({ where: { method: PaymentMethod.CASH, paymentDate: LessThanOrEqual(selectedDate) }, relations, order: { paymentDate: 'DESC', createdAt: 'DESC' } }),
      this.paymentsRepository.find({ where: { method: PaymentMethod.CASH, paymentDate: LessThanOrEqual(monthEnd) }, relations }),
      this.buildCapitalBreakdown(previousMonthEnd),
      this.buildCapitalBreakdown(selectedDate),
    ]);
    const initialCapital = this.netCash(beforeMonth);
    const movementsToDay = throughSelectedDay.filter((payment) => payment.paymentDate >= monthStart);
    const dayMovements = throughSelectedDay.filter((payment) => payment.paymentDate === selectedDate);
    return {
      date: selectedDate,
      month: selectedDate.slice(0, 7),
      initialCapital: this.serialize(initialCapital),
      dailyIncome: this.serialize(this.totalByType(dayMovements, true)),
      dailyExpense: this.serialize(this.totalByType(dayMovements, false)),
      closingToDay: this.serialize(this.add(initialCapital, this.netCash(movementsToDay))),
      monthClosing: this.serialize(this.netCash(throughMonthEnd)),
      capitalInitialBreakdown: initialBreakdown,
      capitalBreakdown: currentBreakdown,
      sales: dayMovements.filter((payment) => Boolean(payment.sale)),
      purchases: dayMovements.filter((payment) => Boolean(payment.purchase)),
    };
  }

  private empty(): Amounts { return Object.values(Currency).reduce((result, currency) => ({ ...result, [currency]: 0 }), {} as Amounts); }
  private netCash(payments: Payment[]) { return payments.reduce((result, payment) => { result[payment.currency] += (payment.sale ? 1 : -1) * toNumber(payment.amount); return result; }, this.empty()); }
  private totalByType(payments: Payment[], income: boolean) { return payments.filter((payment) => income ? Boolean(payment.sale) : Boolean(payment.purchase)).reduce((result, payment) => { result[payment.currency] += toNumber(payment.amount); return result; }, this.empty()); }
  private add(left: Amounts, right: Amounts) { return Object.values(Currency).reduce((result, currency) => ({ ...result, [currency]: left[currency] + right[currency] }), {} as Amounts); }
  private serialize(amounts: Amounts) { return Object.fromEntries(Object.entries(amounts).map(([currency, amount]) => [currency, toMoney(amount)])); }

  private async buildCapitalBreakdown(end: string) {
    const [payments, sales, purchases, stock] = await Promise.all([
      this.paymentsRepository.find({ where: { paymentDate: LessThanOrEqual(end) }, relations: { sale: true, purchase: true } }),
      this.salesRepository.find({ where: { saleDate: LessThanOrEqual(end) }, relations: { payments: true } }),
      this.purchasesRepository.find({ where: { purchaseDate: LessThanOrEqual(end) }, relations: { payments: true } }),
      this.stockRepository.find({ where: { entryDate: LessThanOrEqual(end) }, relations: { saleItem: { sale: true } } }),
    ]);
    const cash = this.empty();
    const bank = this.empty();
    const currentAccount = this.empty();
    const stockValue = this.empty();

    for (const payment of payments) {
      const direction = payment.sale ? 1 : -1;
      if (payment.method === PaymentMethod.CASH) cash[payment.currency] += direction * toNumber(payment.amount);
      if (payment.method === PaymentMethod.TRANSFER) bank[payment.currency] += direction * toNumber(payment.amount);
    }
    for (const sale of sales) currentAccount[sale.currency] += this.balanceAt(sale.totalAmount, sale.paidAmount, sale.payments, end);
    for (const purchase of purchases) currentAccount[purchase.currency] -= this.balanceAt(purchase.totalAmount, purchase.paidAmount, purchase.payments, end);
    for (const item of stock) {
      if (!item.saleItem?.sale || item.saleItem.sale.saleDate > end) stockValue[item.costCurrency] += toNumber(item.costAmount);
    }
    const total = Object.values(Currency).reduce((result, currency) => ({ ...result, [currency]: cash[currency] + bank[currency] + currentAccount[currency] + stockValue[currency] }), {} as Amounts);
    return { cash: this.serialize(cash), bank: this.serialize(bank), currentAccount: this.serialize(currentAccount), stock: this.serialize(stockValue), total: this.serialize(total) };
  }

  private balanceAt(total: string, paid: string, payments: Payment[], end: string) {
    const allPayments = payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);
    const initialPaid = Math.max(toNumber(paid) - allPayments, 0);
    const paidAtDate = initialPaid + payments.filter((payment) => payment.paymentDate <= end).reduce((sum, payment) => sum + toNumber(payment.amount), 0);
    return Math.max(toNumber(total) - paidAtDate, 0);
  }
}
