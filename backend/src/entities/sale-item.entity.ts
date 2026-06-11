import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Product } from './product.entity';
import { Sale } from './sale.entity';
import { StockItem } from './stock-item.entity';

@Entity({ name: 'sale_items' })
export class SaleItem extends BaseEntity {
  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'numeric', precision: 14, scale: 2 })
  unitPrice: string;

  @Column({ name: 'subtotal_amount', type: 'numeric', precision: 14, scale: 2 })
  subtotalAmount: string;

  @Column({ name: 'is_external_product', default: false })
  isExternalProduct: boolean;

  @Column({ name: 'external_product_name', type: 'varchar', nullable: true, length: 160 })
  externalProductName?: string | null;

  @ManyToOne(() => Sale, (sale) => sale.items, { nullable: false })
  @JoinColumn({ name: 'sale_id' })
  sale: Sale;

  @ManyToOne(() => Product, (product) => product.saleItems, { nullable: true })
  @JoinColumn({ name: 'product_id' })
  product?: Product | null;

  @OneToOne(() => StockItem, (stockItem) => stockItem.saleItem, { nullable: true })
  @JoinColumn({ name: 'stock_item_id' })
  stockItem?: StockItem | null;
}
