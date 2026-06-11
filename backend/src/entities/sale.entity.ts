import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Currency } from '../common/enums/currency.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { BaseEntity } from './base.entity';
import { Payment } from './payment.entity';
import { SaleItem } from './sale-item.entity';
import { User } from './user.entity';
import { Wholesaler } from './wholesaler.entity';

@Entity({ name: 'sales' })
export class Sale extends BaseEntity {
  @Column({ name: 'sale_date', type: 'date' })
  saleDate: string;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate?: string | null;

  @Column({ name: 'subtotal_amount', type: 'numeric', precision: 14, scale: 2 })
  subtotalAmount: string;

  @Column({ name: 'discount_amount', type: 'numeric', precision: 14, scale: 2, default: 0 })
  discountAmount: string;

  @Column({ name: 'total_amount', type: 'numeric', precision: 14, scale: 2 })
  totalAmount: string;

  @Column({ name: 'paid_amount', type: 'numeric', precision: 14, scale: 2, default: 0 })
  paidAmount: string;

  @Column({ name: 'balance_amount', type: 'numeric', precision: 14, scale: 2, default: 0 })
  balanceAmount: string;

  @Column({ type: 'enum', enum: Currency, default: Currency.ARS })
  currency: Currency;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ nullable: true, type: 'text' })
  notes?: string | null;

  @ManyToOne(() => Wholesaler, (wholesaler) => wholesaler.sales, { nullable: false })
  @JoinColumn({ name: 'wholesaler_id' })
  wholesaler: Wholesaler;

  @ManyToOne(() => User, (user) => user.sales, { nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: User | null;

  @OneToMany(() => SaleItem, (saleItem) => saleItem.sale, { cascade: true })
  items: SaleItem[];

  @OneToMany(() => Payment, (payment) => payment.sale)
  payments: Payment[];
}
