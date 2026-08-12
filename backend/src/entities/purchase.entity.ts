import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Currency } from '../common/enums/currency.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { BaseEntity } from './base.entity';
import { PurchaseItem } from './purchase-item.entity';
import { Payment } from './payment.entity';
import { Supplier } from './supplier.entity';
import { User } from './user.entity';

@Entity({ name: 'purchases' })
export class Purchase extends BaseEntity {
  @Column({ name: 'purchase_date', type: 'date' })
  purchaseDate: string;

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

  @ManyToOne(() => Supplier, (supplier) => supplier.purchases, { nullable: false })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @ManyToOne(() => User, (user) => user.purchases, { nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: User | null;

  @OneToMany(() => PurchaseItem, (purchaseItem) => purchaseItem.purchase, { cascade: true })
  items: PurchaseItem[];

  @OneToMany(() => Payment, (payment) => payment.purchase)
  payments: Payment[];
}
