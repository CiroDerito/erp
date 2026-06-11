import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Payment } from './payment.entity';
import { Sale } from './sale.entity';

@Entity({ name: 'wholesalers' })
export class Wholesaler extends BaseEntity {
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

  @OneToMany(() => Sale, (sale) => sale.wholesaler)
  sales: Sale[];

  @OneToMany(() => Payment, (payment) => payment.wholesaler)
  payments: Payment[];
}
