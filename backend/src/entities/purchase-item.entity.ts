import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Product } from './product.entity';
import { Purchase } from './purchase.entity';
import { StockItem } from './stock-item.entity';

@Entity({ name: 'purchase_items' })
export class PurchaseItem extends BaseEntity {
  @Column({ type: 'int' })
  quantity: number;

  @Column({ name: 'unit_cost', type: 'numeric', precision: 14, scale: 2 })
  unitCost: string;

  @Column({ name: 'subtotal_amount', type: 'numeric', precision: 14, scale: 2 })
  subtotalAmount: string;

  @ManyToOne(() => Purchase, (purchase) => purchase.items, { nullable: false })
  @JoinColumn({ name: 'purchase_id' })
  purchase: Purchase;

  @ManyToOne(() => Product, (product) => product.purchaseItems, { nullable: false })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @OneToMany(() => StockItem, (stockItem) => stockItem.purchaseItem)
  stockItems: StockItem[];
}
