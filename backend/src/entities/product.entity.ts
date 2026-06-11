import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { PurchaseItem } from './purchase-item.entity';
import { SaleItem } from './sale-item.entity';
import { StockItem } from './stock-item.entity';

@Entity({ name: 'products' })
export class Product extends BaseEntity {
  @Column({ length: 160 })
  name: string;

  @Column({ type: 'varchar', nullable: true, length: 120 })
  model?: string | null;

  @Column({ type: 'varchar', nullable: true, length: 80 })
  brand?: string | null;

  @Column({ nullable: true, type: 'text' })
  description?: string | null;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => StockItem, (stockItem) => stockItem.product)
  stockItems: StockItem[];

  @OneToMany(() => PurchaseItem, (purchaseItem) => purchaseItem.product)
  purchaseItems: PurchaseItem[];

  @OneToMany(() => SaleItem, (saleItem) => saleItem.product)
  saleItems: SaleItem[];
}
