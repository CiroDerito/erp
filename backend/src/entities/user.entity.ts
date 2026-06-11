import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Purchase } from './purchase.entity';
import { Sale } from './sale.entity';

@Entity({ name: 'users' })
export class User extends BaseEntity {
  @Column({ length: 120 })
  name: string;

  @Column({ unique: true, length: 160 })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Sale, (sale) => sale.createdBy)
  sales: Sale[];

  @OneToMany(() => Purchase, (purchase) => purchase.createdBy)
  purchases: Purchase[];
}
