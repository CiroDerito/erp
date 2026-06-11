import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Purchase } from './purchase.entity';
import { StockItem } from './stock-item.entity';

@Entity({ name: 'suppliers' })
export class Supplier extends BaseEntity {
  @Column({ length: 140 })
  name: string;

  @Column({ type: 'varchar', nullable: true, length: 60 })
  phone?: string | null;

  @Column({ type: 'varchar', nullable: true, length: 160 })
  email?: string | null;

  @Column({ nullable: true, type: 'text' })
  notes?: string | null;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Purchase, (purchase) => purchase.supplier)
  purchases: Purchase[];

  @OneToMany(() => StockItem, (stockItem) => stockItem.supplier)
  stockItems: StockItem[];
}
