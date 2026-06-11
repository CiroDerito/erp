import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Currency } from '../common/enums/currency.enum';
import { PaymentMethod } from '../common/enums/payment-method.enum';
import { BaseEntity } from './base.entity';
import { Purchase } from './purchase.entity';
import { Sale } from './sale.entity';
import { Supplier } from './supplier.entity';
import { Wholesaler } from './wholesaler.entity';

@Entity({ name: 'payments' })
export class Payment extends BaseEntity {
  @Column({ name: 'payment_date', type: 'date' })
  paymentDate: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount: string;

  @Column({ type: 'enum', enum: Currency, default: Currency.ARS })
  currency: Currency;

  @Column({ name: 'usd_rate_ars', type: 'numeric', precision: 14, scale: 2, nullable: true })
  usdRateArs?: string | null;

  @Column({ name: 'usd_amount', type: 'numeric', precision: 14, scale: 2, nullable: true })
  usdAmount?: string | null;

  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.TRANSFER })
  method: PaymentMethod;

  @Column({ nullable: true, type: 'text' })
  observations?: string | null;

  @ManyToOne(() => Wholesaler, (wholesaler) => wholesaler.payments, { nullable: true })
  @JoinColumn({ name: 'wholesaler_id' })
  wholesaler?: Wholesaler | null;

  @ManyToOne(() => Sale, (sale) => sale.payments, { nullable: true })
  @JoinColumn({ name: 'sale_id' })
  sale?: Sale | null;

  @ManyToOne(() => Supplier, { nullable: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier?: Supplier | null;

  @ManyToOne(() => Purchase, { nullable: true })
  @JoinColumn({ name: 'purchase_id' })
  purchase?: Purchase | null;
}
