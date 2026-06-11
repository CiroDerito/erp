import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { Currency } from '../common/enums/currency.enum';
import { StockStatus } from '../common/enums/stock-status.enum';
import { BaseEntity } from './base.entity';
import { Product } from './product.entity';
import { PurchaseItem } from './purchase-item.entity';
import { SaleItem } from './sale-item.entity';
import { Supplier } from './supplier.entity';

@Entity({ name: 'stock_items' })
export class StockItem extends BaseEntity {
  @Column({ unique: true, length: 80 })
  imei: string;

  @Column({ name: 'barcode', type: 'varchar', nullable: true, unique: true, length: 120 })
  barcode?: string | null;

  @Column({ name: 'entry_date', type: 'date' })
  entryDate: string;

  @Column({ name: 'cost_amount', type: 'numeric', precision: 14, scale: 2 })
  costAmount: string;

  @Column({ name: 'cost_currency', type: 'enum', enum: Currency, default: Currency.ARS })
  costCurrency: Currency;

  @Column({ type: 'enum', enum: StockStatus, default: StockStatus.AVAILABLE })
  status: StockStatus;

  @ManyToOne(() => Product, (product) => product.stockItems, { nullable: false })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => Supplier, (supplier) => supplier.stockItems, { nullable: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier?: Supplier | null;

  @ManyToOne(() => PurchaseItem, (purchaseItem) => purchaseItem.stockItems, { nullable: true })
  @JoinColumn({ name: 'purchase_item_id' })
  purchaseItem?: PurchaseItem | null;

  @OneToOne(() => SaleItem, (saleItem) => saleItem.stockItem)
  saleItem?: SaleItem | null;
}
